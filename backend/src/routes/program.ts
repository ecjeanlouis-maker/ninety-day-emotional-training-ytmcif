import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { computeEntitlement } from '../lib/entitlement.js';

function isPremiumProfile(p: { role: string; accountType: string; subscriptionStatus: string; trialStatus: string; subscriptionEndDate: Date | null }): boolean {
  const now = new Date();
  const end = p.subscriptionEndDate ? new Date(p.subscriptionEndDate) : null;
  if (p.role === 'admin') return true;
  if (p.subscriptionStatus === 'active' && p.accountType === 'premium') return !end || end > now;
  if (p.subscriptionStatus === 'trialing' && p.trialStatus === 'active') return !end || end > now;
  if (p.subscriptionStatus === 'cancelled' && end && end > now) return true;
  if (p.subscriptionStatus === 'past_due') return true;
  return false;
}

async function getUserIsPremium(app: App, userId: string): Promise<boolean> {
  const rows = await app.db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId)).limit(1);
  return rows.length > 0 && isPremiumProfile(rows[0]);
}

async function getPrevDayCompleted(app: App, userId: string, dayNum: number): Promise<boolean> {
  if (dayNum <= 1) return true;
  const rows = await app.db.select().from(schema.userDayProgress)
    .where(and(eq(schema.userDayProgress.userId, userId), eq(schema.userDayProgress.dayNumber, dayNum - 1))).limit(1);
  return rows.length > 0 && rows[0].completed === true;
}

// ─── Entitlement helpers (inline) ─────────────────────────────────────────────

function computeEntitlementLocal(profile: {
  role: string;
  accountType: string;
  subscriptionStatus: string;
  trialStatus: string;
  subscriptionEndDate: Date | null;
  paymentStatus: string;
}): { isPremium: boolean; status: string; validUntil: string | null; reason: string } {
  const now = new Date();
  const endDate = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;

  if (profile.role === 'admin') {
    return { isPremium: true, status: 'active', validUntil: null, reason: 'admin_role' };
  }
  if (profile.subscriptionStatus === 'active' && profile.accountType === 'premium') {
    if (!endDate || endDate > now) {
      return { isPremium: true, status: 'active', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_active' };
    }
    return { isPremium: false, status: 'expired', validUntil: endDate.toISOString(), reason: 'subscription_expired' };
  }
  if (profile.subscriptionStatus === 'trialing' && profile.trialStatus === 'active') {
    if (!endDate || endDate > now) {
      return { isPremium: true, status: 'trialing', validUntil: endDate?.toISOString() ?? null, reason: 'trial_active' };
    }
    return { isPremium: false, status: 'expired', validUntil: endDate?.toISOString() ?? null, reason: 'trial_expired' };
  }
  if (profile.subscriptionStatus === 'cancelled' && endDate && endDate > now) {
    return { isPremium: true, status: 'grace', validUntil: endDate.toISOString(), reason: 'canceled_period_end' };
  }
  if (profile.subscriptionStatus === 'past_due') {
    return { isPremium: true, status: 'past_due', validUntil: endDate?.toISOString() ?? null, reason: 'payment_past_due' };
  }
  if (profile.subscriptionStatus === 'refunded' || profile.paymentStatus === 'refunded') {
    return { isPremium: false, status: 'refunded_or_revoked', validUntil: null, reason: 'payment_refunded' };
  }
  if (profile.subscriptionStatus === 'paused') {
    return { isPremium: false, status: 'paused', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_paused' };
  }
  if (profile.subscriptionStatus === 'expired') {
    return { isPremium: false, status: 'expired', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_expired' };
  }
  return { isPremium: false, status: 'free', validUntil: null, reason: 'no_subscription' };
}

async function checkPremiumEntitlementLocal(app: App, userId: string): Promise<boolean> {
  const profileRows = await app.db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);
  if (profileRows.length === 0) return false;
  return computeEntitlementLocal(profileRows[0]).isPremium;
}

async function checkProgressionLockLocal(app: App, userId: string, dayNumber: number): Promise<{ locked: boolean; requiredDay: number }> {
  if (dayNumber <= 1) return { locked: false, requiredDay: 0 };
  const prevDay = dayNumber - 1;
  const prevRecords = await app.db
    .select()
    .from(schema.userDayProgress)
    .where(and(
      eq(schema.userDayProgress.userId, userId),
      eq(schema.userDayProgress.dayNumber, prevDay)
    ))
    .limit(1);
  const prevCompleted = prevRecords.length > 0 && prevRecords[0].completed === true;
  return { locked: !prevCompleted, requiredDay: prevDay };
}

interface DayContent {
  day_number: number;
  title: string;
  phase: string;
  week: number;
  lesson_content: string;
  drill_instructions: string;
  challenge: string;
  reflection_prompt: string;
}

interface DayProgressResponse {
  day_number: number;
  completed: boolean;
  lesson_read: boolean;
  drill_completed: boolean;
  reflection_text?: string;
  completed_at?: string;
}

// Category → phase mapping
function categoryToPhase(category: string): string {
  switch (category) {
    case 'emotional': return 'Awareness';
    case 'confidence': return 'Confidence';
    case 'anger': return 'Regulation';
    case 'stress': return 'Regulation';
    case 'social-anxiety': return 'Communication';
    case 'thoughts': return 'Thought Control';
    default: return 'Awareness';
  }
}

// Week number → phase for template days
function weekToPhase(week: number): string {
  if (week <= 2) return 'Awareness';
  if (week <= 4) return 'Regulation';
  if (week <= 6) return 'Thought Control';
  if (week <= 8) return 'Confidence';
  if (week <= 10) return 'Communication';
  if (week <= 12) return 'Resilience';
  return 'Integration';
}

// Build the 90-day content array from the techniques data
const PROGRAM_DAYS: DayContent[] = [
  // Days 1-12: Emotional Control
  {
    day_number: 1, title: 'Deep Breathing Exercise', phase: 'Awareness', week: 1,
    lesson_content: 'Practice 4-7-8 breathing technique to calm your nervous system.\n\nGoal: Calms the nervous system and reduces anxiety instantly',
    drill_instructions: 'Inhale deeply through your nose for 4 seconds\nHold your breath for 7 seconds\nExhale slowly through your mouth for 8 seconds\nRepeat this cycle 5-10 times',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 2, title: 'Emotion Journaling', phase: 'Awareness', week: 2,
    lesson_content: 'Write down your emotions and triggers to understand patterns.\n\nGoal: Understanding patterns helps you respond rather than react',
    drill_instructions: 'Set aside 10 minutes each evening\nWrite down emotions you experienced today\nIdentify what triggered each emotion\nNote how you responded to each trigger',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 3, title: 'Mindful Pause', phase: 'Awareness', week: 3,
    lesson_content: 'Create space between stimulus and response.\n\nGoal: Creates space between stimulus and response for better decisions',
    drill_instructions: 'When emotions rise, stop immediately\nTake a deep breath and count to 10\nObserve your feelings without judgment\nChoose your response consciously',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 4, title: 'Progressive Muscle Relaxation', phase: 'Awareness', week: 4,
    lesson_content: 'Release physical tension that accompanies emotional stress.\n\nGoal: Releases physical tension that accompanies emotional stress',
    drill_instructions: 'Find a quiet place to sit or lie down\nTense each muscle group for 5 seconds\nRelease and notice the relaxation\nMove from head to toe systematically',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 5, title: 'Emotion Labeling', phase: 'Awareness', week: 5,
    lesson_content: 'Name your emotions specifically to reduce their intensity.\n\nGoal: Research shows labeling reduces emotional intensity by 50%',
    drill_instructions: 'When you feel an emotion, pause\nName it specifically (not just "bad" or "good")\nSay it out loud or write it down\nNotice how naming it reduces intensity',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 6, title: 'Reframing Thoughts', phase: 'Awareness', week: 6,
    lesson_content: 'Challenge negative thoughts with evidence and perspective.\n\nGoal: Transforms negative thinking patterns into balanced perspectives',
    drill_instructions: 'Notice a negative thought\nAsk: Is this thought absolutely true?\nLook for evidence against the thought\nFind an alternative, balanced perspective',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 7, title: 'Grounding Technique', phase: 'Awareness', week: 7,
    lesson_content: 'Use your senses to anchor yourself in the present moment.\n\nGoal: Anchors you in the present moment during anxiety or stress',
    drill_instructions: 'Name 5 things you can see\nName 4 things you can hear\nName 3 things you can feel\nName 2 things you can smell\nName 1 thing you can taste',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 8, title: 'Emotional Boundaries', phase: 'Awareness', week: 8,
    lesson_content: 'Protect your emotional energy by setting healthy limits.\n\nGoal: Protects your emotional energy and prevents burnout',
    drill_instructions: 'Identify emotional demands that drain you\nPractice saying "no" without guilt\nCommunicate your limits clearly\nPrioritize your emotional well-being',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 9, title: 'Body Scan Meditation', phase: 'Awareness', week: 9,
    lesson_content: 'Build emotional awareness through body sensations.\n\nGoal: Builds emotional awareness and mind-body connection',
    drill_instructions: 'Lie down or sit comfortably\nClose your eyes and breathe naturally\nScan from head to toe, noticing sensations\nObserve without trying to change anything',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 10, title: 'Trigger Tracking', phase: 'Awareness', week: 10,
    lesson_content: 'Identify patterns in what triggers emotional reactions.\n\nGoal: Awareness of triggers is the first step to emotional control',
    drill_instructions: 'Keep a trigger log throughout the week\nNote situations that caused strong emotions\nIdentify common patterns or themes\nPlan strategies for known triggers',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 11, title: 'Compassionate Self-Talk', phase: 'Awareness', week: 11,
    lesson_content: 'Replace harsh criticism with understanding and kindness.\n\nGoal: Replaces harsh self-criticism with supportive inner dialogue',
    drill_instructions: 'Notice when you are being self-critical\nAsk: Would I say this to a friend?\nReframe with compassion and understanding\nSpeak to yourself as you would to someone you love',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 12, title: 'Emotional Mastery Integration', phase: 'Awareness', week: 12,
    lesson_content: 'Combine all techniques into your daily routine.\n\nGoal: You now have the tools to master any emotion that arises',
    drill_instructions: 'Review all 11 techniques you have learned\nChoose 3-5 that work best for you\nCreate a daily practice schedule\nCommit to consistent application',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  // Days 13-24: Confidence
  {
    day_number: 13, title: 'Positive Affirmations', phase: 'Confidence', week: 1,
    lesson_content: 'Rewire your brain for confidence and self-belief.\n\nGoal: Rewires your brain for confidence and self-belief',
    drill_instructions: 'Write 5 positive statements about yourself\nStand in front of a mirror each morning\nSpeak each affirmation with conviction\nFeel the truth of each statement',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 14, title: 'Power Posing', phase: 'Confidence', week: 2,
    lesson_content: 'Use body language to boost confidence hormones.\n\nGoal: Increases testosterone and reduces cortisol for instant confidence',
    drill_instructions: 'Stand with feet shoulder-width apart\nPlace hands on hips or raise arms in victory\nHold the pose for 2 minutes\nBreathe deeply and feel powerful',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 15, title: 'Gratitude Practice', phase: 'Confidence', week: 3,
    lesson_content: 'Shift focus from problems to possibilities.\n\nGoal: Shifts focus from problems to possibilities and abundance',
    drill_instructions: 'Each evening, write down 3 things you are grateful for\nBe specific about why you are grateful\nInclude small and large things\nFeel the appreciation as you write',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 16, title: 'Visualization Success', phase: 'Confidence', week: 4,
    lesson_content: 'Rehearse success to build neural pathways.\n\nGoal: Your brain rehearses success, building confidence neural pathways',
    drill_instructions: 'Find a quiet place and close your eyes\nVisualize yourself succeeding in detail\nEngage all senses in the visualization\nFeel the emotions of success',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 17, title: 'Small Wins Tracking', phase: 'Confidence', week: 5,
    lesson_content: 'Build momentum and reinforce your capability.\n\nGoal: Builds momentum and reinforces your capability',
    drill_instructions: 'Each evening, record 3 small accomplishments\nInclude tasks completed, challenges overcome\nCelebrate each win, no matter how small\nReview your wins weekly',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 18, title: 'Comfort Zone Expansion', phase: 'Confidence', week: 6,
    lesson_content: 'Grow confidence through action, not contemplation.\n\nGoal: Confidence grows through action, not contemplation',
    drill_instructions: 'Choose one thing that scares you slightly\nPlan when and how you will do it\nTake action despite the fear\nReflect on what you learned',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 19, title: 'Skill Building', phase: 'Confidence', week: 7,
    lesson_content: 'Build competence to breed confidence.\n\nGoal: Competence breeds confidence in all areas of life',
    drill_instructions: 'Choose a skill you want to develop\nDedicate 30 minutes daily to practice\nTrack your progress and improvements\nCelebrate milestones along the way',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 20, title: 'Social Confidence Practice', phase: 'Confidence', week: 8,
    lesson_content: 'Improve social skills through consistent practice.\n\nGoal: Social skills improve with practice, building social confidence',
    drill_instructions: 'Set a goal to talk to 3 strangers this week\nStart with simple greetings or questions\nPractice active listening\nNotice your confidence growing',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 21, title: 'Body Language Mastery', phase: 'Confidence', week: 9,
    lesson_content: 'Use confident body language to shape your mindset.\n\nGoal: Your body shapes your mind - confident posture creates confidence',
    drill_instructions: 'Practice shoulders back, chest open\nMaintain eye contact in conversations\nUse a firm handshake\nWalk with purpose and energy',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 22, title: 'Public Speaking Practice', phase: 'Confidence', week: 10,
    lesson_content: 'Build communication confidence through daily practice.\n\nGoal: Communication confidence is key to overall confidence',
    drill_instructions: 'Choose a topic and speak for 2 minutes\nRecord yourself on video\nWatch and note areas to improve\nPractice again with improvements',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 23, title: 'Celebrate Your Progress', phase: 'Confidence', week: 11,
    lesson_content: 'Build lasting confidence through self-recognition.\n\nGoal: Self-recognition builds lasting confidence and self-worth',
    drill_instructions: 'Review your journey from week 1\nList all the progress you have made\nAcknowledge how far you have come\nCelebrate your commitment and growth',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 24, title: 'Confidence Lifestyle Integration', phase: 'Confidence', week: 12,
    lesson_content: 'Integrate all confidence techniques into your identity.\n\nGoal: You are now a confident person - this is your new identity',
    drill_instructions: 'Review all 11 confidence techniques\nChoose your top 5 daily practices\nCreate a sustainable routine\nCommit to living as a confident person',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  // Days 25-36: Anger Management
  {
    day_number: 25, title: 'Anger Recognition', phase: 'Regulation', week: 1,
    lesson_content: 'Identify early warning signs of anger before it escalates.\n\nGoal: Early recognition allows you to intervene before anger escalates',
    drill_instructions: 'Notice physical sensations (tension, heat, rapid heartbeat)\nIdentify thoughts that trigger anger\nRate your anger level from 1-10\nRecord patterns in an anger journal',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 26, title: 'Timeout Technique', phase: 'Regulation', week: 2,
    lesson_content: 'Remove yourself from triggering situations to cool down.\n\nGoal: Physical distance prevents reactive anger responses',
    drill_instructions: 'When anger rises, say "I need a timeout"\nLeave the situation for 15-20 minutes\nPractice deep breathing during timeout\nReturn when you feel calmer',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 27, title: 'Anger Thought Challenging', phase: 'Regulation', week: 3,
    lesson_content: 'Question and reframe anger-inducing thoughts.\n\nGoal: Challenging thoughts reduces anger intensity and duration',
    drill_instructions: 'Identify the thought fueling your anger\nAsk: Is this thought 100% accurate?\nConsider alternative explanations\nReplace with a balanced perspective',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 28, title: 'Physical Release Exercise', phase: 'Regulation', week: 4,
    lesson_content: 'Channel anger energy through physical activity.\n\nGoal: Physical activity releases anger energy safely and effectively',
    drill_instructions: 'Go for a brisk walk or run\nDo push-ups or jumping jacks\nHit a punching bag or pillow\nEngage in any vigorous exercise',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 29, title: 'Empathy Practice', phase: 'Regulation', week: 5,
    lesson_content: "See situations from others' perspectives to reduce anger.\n\nGoal: Empathy dissolves anger by creating understanding",
    drill_instructions: "Pause and consider the other person's viewpoint\nAsk: What might they be experiencing?\nImagine their challenges and pressures\nFind compassion for their situation",
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 30, title: 'Assertive Communication', phase: 'Regulation', week: 6,
    lesson_content: 'Express anger constructively without aggression.\n\nGoal: Assertiveness expresses anger productively without damaging relationships',
    drill_instructions: 'Use "I feel" statements instead of "You" accusations\nState your needs clearly and calmly\nListen to the other person\'s response\nWork toward a solution together',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 31, title: 'Relaxation Response', phase: 'Regulation', week: 7,
    lesson_content: "Activate your body's natural calming system.\n\nGoal: Regular relaxation practice reduces overall anger reactivity",
    drill_instructions: 'Practice progressive muscle relaxation\nUse guided imagery of peaceful scenes\nListen to calming music\nEngage in meditation or yoga',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 32, title: 'Humor and Perspective', phase: 'Regulation', week: 8,
    lesson_content: 'Use humor to defuse anger and gain perspective.\n\nGoal: Humor shifts perspective and reduces anger intensity',
    drill_instructions: 'Ask: Will this matter in 5 years?\nFind the absurdity in the situation\nUse self-deprecating humor appropriately\nLaugh at the situation, not the person',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 33, title: 'Forgiveness Practice', phase: 'Regulation', week: 9,
    lesson_content: 'Release anger by practicing forgiveness.\n\nGoal: Forgiveness frees you from the burden of chronic anger',
    drill_instructions: 'Acknowledge the hurt you experienced\nRecognize that holding anger hurts you\nChoose to forgive for your own peace\nLet go of the need for revenge',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 34, title: 'Problem-Solving Focus', phase: 'Regulation', week: 10,
    lesson_content: 'Channel anger into constructive problem-solving.\n\nGoal: Problem-solving transforms anger into productive action',
    drill_instructions: 'Define the problem clearly\nBrainstorm possible solutions\nEvaluate pros and cons of each\nTake action on the best solution',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 35, title: 'Anger Prevention Lifestyle', phase: 'Regulation', week: 11,
    lesson_content: 'Build habits that prevent anger buildup.\n\nGoal: A healthy lifestyle reduces overall anger susceptibility',
    drill_instructions: 'Get adequate sleep (7-9 hours)\nExercise regularly (30 minutes daily)\nLimit caffeine and alcohol\nMaintain healthy relationships',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 36, title: 'Anger Mastery Integration', phase: 'Regulation', week: 12,
    lesson_content: 'Integrate all anger management techniques into daily life.\n\nGoal: You now have complete control over your anger responses',
    drill_instructions: 'Review all 11 anger management techniques\nIdentify your top 5 most effective tools\nCreate an anger management action plan\nCommit to using these tools consistently',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  // Days 37-48: Stress Management
  {
    day_number: 37, title: 'Stress Awareness', phase: 'Regulation', week: 1,
    lesson_content: 'Identify your personal stress triggers and responses.\n\nGoal: Awareness is the first step to managing stress effectively',
    drill_instructions: 'Keep a stress diary for one week\nNote situations that cause stress\nRecord your physical and emotional responses\nIdentify patterns and common triggers',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 38, title: 'Time Management', phase: 'Regulation', week: 2,
    lesson_content: 'Reduce stress through better organization and planning.\n\nGoal: Effective time management eliminates overwhelm and stress',
    drill_instructions: 'Create a daily priority list\nBreak large tasks into smaller steps\nSchedule breaks throughout the day\nLearn to say no to non-essential tasks',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 39, title: 'Mindfulness Meditation', phase: 'Regulation', week: 3,
    lesson_content: 'Practice present-moment awareness to reduce stress.\n\nGoal: Mindfulness reduces stress by anchoring you in the present',
    drill_instructions: 'Sit comfortably and close your eyes\nFocus on your breath\nWhen mind wanders, gently return to breath\nPractice for 10-15 minutes daily',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 40, title: 'Physical Exercise', phase: 'Regulation', week: 4,
    lesson_content: 'Use movement to release stress hormones.\n\nGoal: Exercise is one of the most effective stress relievers',
    drill_instructions: 'Choose an activity you enjoy\nExercise for at least 30 minutes\nAim for moderate intensity\nMake it a regular habit',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 41, title: 'Social Support', phase: 'Regulation', week: 5,
    lesson_content: 'Connect with others to reduce stress.\n\nGoal: Social connection is a powerful stress buffer',
    drill_instructions: 'Reach out to friends or family\nShare your feelings and concerns\nAsk for help when needed\nOffer support to others',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 42, title: 'Healthy Boundaries', phase: 'Regulation', week: 6,
    lesson_content: 'Protect your energy by setting clear limits.\n\nGoal: Boundaries prevent stress from overwhelming you',
    drill_instructions: 'Identify what drains your energy\nCommunicate your limits clearly\nPractice saying no without guilt\nPrioritize self-care',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 43, title: 'Sleep Hygiene', phase: 'Regulation', week: 7,
    lesson_content: 'Improve sleep quality to reduce stress.\n\nGoal: Quality sleep is essential for stress resilience',
    drill_instructions: 'Maintain a consistent sleep schedule\nCreate a relaxing bedtime routine\nAvoid screens 1 hour before bed\nKeep bedroom cool and dark',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 44, title: 'Nutrition for Stress', phase: 'Regulation', week: 8,
    lesson_content: "Eat foods that support stress management.\n\nGoal: Proper nutrition supports your body's stress response",
    drill_instructions: 'Eat regular, balanced meals\nInclude omega-3 rich foods\nLimit caffeine and sugar\nStay hydrated throughout the day',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 45, title: 'Creative Expression', phase: 'Regulation', week: 9,
    lesson_content: 'Use creativity as a stress outlet.\n\nGoal: Creative expression provides a healthy stress release',
    drill_instructions: 'Choose a creative activity (art, music, writing)\nEngage without judgment or pressure\nFocus on the process, not the outcome\nMake time for creativity regularly',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 46, title: 'Nature Connection', phase: 'Regulation', week: 10,
    lesson_content: 'Reduce stress through time in nature.\n\nGoal: Nature exposure significantly reduces stress hormones',
    drill_instructions: 'Spend time outdoors daily\nTake walks in natural settings\nPractice mindfulness in nature\nNotice the calming effects',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 47, title: 'Gratitude Practice', phase: 'Regulation', week: 11,
    lesson_content: 'Shift focus from stressors to blessings.\n\nGoal: Gratitude rewires your brain away from stress',
    drill_instructions: 'Write down 3 things you are grateful for\nBe specific and detailed\nFeel the appreciation deeply\nReview your gratitude list regularly',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 48, title: 'Stress Resilience Integration', phase: 'Regulation', week: 12,
    lesson_content: 'Build a comprehensive stress management lifestyle.\n\nGoal: You now have the tools to thrive under any stress',
    drill_instructions: 'Review all 11 stress management techniques\nChoose your top 5 daily practices\nCreate a stress management routine\nCommit to lifelong stress resilience',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  // Days 49-60: Social Anxiety
  {
    day_number: 49, title: 'Understanding Social Anxiety', phase: 'Communication', week: 1,
    lesson_content: 'Learn about social anxiety and its patterns.\n\nGoal: Understanding your anxiety is the first step to overcoming it',
    drill_instructions: 'Identify situations that trigger anxiety\nNotice physical symptoms (sweating, trembling)\nRecognize negative thought patterns\nUnderstand that anxiety is common and treatable',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 50, title: 'Breathing for Anxiety', phase: 'Communication', week: 2,
    lesson_content: 'Use breath control to calm social anxiety.\n\nGoal: Controlled breathing calms your nervous system instantly',
    drill_instructions: 'Practice box breathing (4-4-4-4)\nBreathe deeply before social situations\nUse breath as an anchor during anxiety\nPractice daily to build the skill',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 51, title: 'Challenging Anxious Thoughts', phase: 'Communication', week: 3,
    lesson_content: 'Question and reframe anxiety-producing thoughts.\n\nGoal: Thought challenging reduces anxiety intensity',
    drill_instructions: 'Identify the anxious thought\nAsk: What evidence supports this thought?\nConsider alternative, realistic thoughts\nReplace with balanced perspectives',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 52, title: 'Gradual Exposure', phase: 'Communication', week: 4,
    lesson_content: 'Face feared situations gradually to build confidence.\n\nGoal: Gradual exposure is the most effective anxiety treatment',
    drill_instructions: 'Create a hierarchy of feared situations\nStart with the least anxiety-provoking\nPractice repeatedly until anxiety decreases\nGradually move to more challenging situations',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 53, title: 'Social Skills Practice', phase: 'Communication', week: 5,
    lesson_content: 'Build confidence through skill development.\n\nGoal: Social skills reduce anxiety by increasing competence',
    drill_instructions: 'Practice conversation starters\nWork on active listening skills\nLearn to ask open-ended questions\nPractice with safe people first',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 54, title: 'Mindfulness in Social Situations', phase: 'Communication', week: 6,
    lesson_content: 'Stay present instead of worrying about judgment.\n\nGoal: Mindfulness reduces self-consciousness and anxiety',
    drill_instructions: 'Focus on the conversation, not your anxiety\nNotice your surroundings\nListen actively to others\nReturn to the present when mind wanders',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 55, title: 'Self-Compassion', phase: 'Communication', week: 7,
    lesson_content: 'Treat yourself with kindness during anxiety.\n\nGoal: Self-compassion reduces anxiety and builds resilience',
    drill_instructions: 'Acknowledge that anxiety is difficult\nSpeak to yourself with compassion\nRecognize that everyone struggles\nCelebrate small victories',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 56, title: 'Body Language Confidence', phase: 'Communication', week: 8,
    lesson_content: 'Use confident body language to reduce anxiety.\n\nGoal: Confident body language reduces anxiety and improves interactions',
    drill_instructions: 'Stand tall with shoulders back\nMake appropriate eye contact\nSmile genuinely\nUse open, relaxed gestures',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 57, title: 'Preparation Strategies', phase: 'Communication', week: 9,
    lesson_content: 'Reduce anxiety through preparation.\n\nGoal: Preparation reduces uncertainty and anxiety',
    drill_instructions: 'Research the social event beforehand\nPrepare conversation topics\nVisualize successful interactions\nPlan an exit strategy if needed',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 58, title: 'Focus Shifting', phase: 'Communication', week: 10,
    lesson_content: 'Shift focus from self to others.\n\nGoal: Focusing on others reduces self-consciousness',
    drill_instructions: 'Ask others questions about themselves\nShow genuine interest in their responses\nFocus on helping others feel comfortable\nNotice how this reduces your anxiety',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 59, title: 'Acceptance and Commitment', phase: 'Communication', week: 11,
    lesson_content: 'Accept anxiety while pursuing valued actions.\n\nGoal: Acceptance allows you to act despite anxiety',
    drill_instructions: 'Accept that some anxiety is normal\nIdentify your social values\nTake action aligned with values despite anxiety\nNotice anxiety decreases with practice',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 60, title: 'Social Confidence Integration', phase: 'Communication', week: 12,
    lesson_content: 'Integrate all techniques into a confident social life.\n\nGoal: You now have the tools to thrive in social situations',
    drill_instructions: 'Review all 11 social anxiety techniques\nIdentify your most effective strategies\nCreate a social confidence action plan\nCommit to regular social engagement',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  // Days 61-72: Thought Regulation
  {
    day_number: 61, title: 'Thought Awareness', phase: 'Thought Control', week: 1,
    lesson_content: 'Become aware of your automatic thoughts.\n\nGoal: Awareness of thoughts is the foundation of regulation',
    drill_instructions: 'Notice thoughts as they arise\nWrite down recurring thoughts\nIdentify patterns in your thinking\nObserve without judgment',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 62, title: 'Cognitive Distortions', phase: 'Thought Control', week: 2,
    lesson_content: 'Identify common thinking errors.\n\nGoal: Recognizing distortions helps you correct them',
    drill_instructions: 'Learn about cognitive distortions\nIdentify which ones you use most\nNotice when they occur\nLabel them when you catch them',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 63, title: 'Thought Challenging', phase: 'Thought Control', week: 3,
    lesson_content: 'Question the validity of negative thoughts.\n\nGoal: Challenging thoughts creates balanced thinking',
    drill_instructions: 'Identify a negative thought\nAsk: What evidence supports this?\nAsk: What evidence contradicts this?\nForm a balanced conclusion',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 64, title: 'Thought Defusion', phase: 'Thought Control', week: 4,
    lesson_content: 'Create distance from your thoughts.\n\nGoal: Defusion reduces the power thoughts have over you',
    drill_instructions: 'Notice a thought and say "I am having the thought that..."\nVisualize thoughts as clouds passing by\nRecognize thoughts are not facts\nLet thoughts come and go without attachment',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 65, title: 'Positive Reframing', phase: 'Thought Control', week: 5,
    lesson_content: 'Find alternative, helpful perspectives.\n\nGoal: Reframing transforms obstacles into opportunities',
    drill_instructions: 'Identify a negative situation\nAsk: What could be positive about this?\nConsider what you can learn\nFind opportunities in challenges',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 66, title: 'Mindful Observation', phase: 'Thought Control', week: 6,
    lesson_content: 'Observe thoughts without engaging with them.\n\nGoal: Mindful observation creates space from thoughts',
    drill_instructions: 'Sit quietly and observe your thoughts\nNotice thoughts arise and pass\nDo not judge or engage with thoughts\nReturn to breath when caught in thought',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 67, title: 'Thought Stopping', phase: 'Thought Control', week: 7,
    lesson_content: 'Interrupt rumination and negative thought spirals.\n\nGoal: Thought stopping breaks negative thought cycles',
    drill_instructions: 'Notice when you are ruminating\nSay "STOP" firmly (out loud or mentally)\nShift attention to something else\nEngage in a different activity',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 68, title: 'Gratitude Thinking', phase: 'Thought Control', week: 8,
    lesson_content: 'Train your mind to focus on positives.\n\nGoal: Gratitude rewires your brain for positive thinking',
    drill_instructions: 'Each day, list 5 things you are grateful for\nBe specific and detailed\nNotice positive aspects of situations\nShare gratitude with others',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 69, title: 'Future-Focused Thinking', phase: 'Thought Control', week: 9,
    lesson_content: 'Direct thoughts toward goals and possibilities.\n\nGoal: Future-focused thinking creates motivation and direction',
    drill_instructions: 'Set clear, specific goals\nVisualize achieving your goals\nThink about steps to reach goals\nFocus on what you can control',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 70, title: 'Compassionate Thinking', phase: 'Thought Control', week: 10,
    lesson_content: 'Replace self-criticism with self-compassion.\n\nGoal: Compassionate thinking builds self-esteem and resilience',
    drill_instructions: 'Notice self-critical thoughts\nAsk: Would I say this to a friend?\nReframe with kindness and understanding\nTreat yourself as you would a loved one',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 71, title: 'Metacognition', phase: 'Thought Control', week: 11,
    lesson_content: 'Think about your thinking patterns.\n\nGoal: Metacognition gives you control over your thinking',
    drill_instructions: 'Reflect on your thought patterns\nIdentify helpful vs unhelpful thinking\nNotice when you are in a negative pattern\nConsciously choose better thought patterns',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  {
    day_number: 72, title: 'Thought Mastery Integration', phase: 'Thought Control', week: 12,
    lesson_content: 'Master your thoughts to master your life.\n\nGoal: You now control your thoughts instead of being controlled by them',
    drill_instructions: 'Review all 11 thought regulation techniques\nChoose your top 5 daily practices\nCreate a thought management routine\nCommit to conscious, intentional thinking',
    challenge: "Apply today's technique in a real situation you encounter today.",
    reflection_prompt: "How did today's practice affect your emotional state? What did you notice?"
  },
  // Days 73-90: Template days (Integration phase)
  ...Array.from({ length: 18 }, (_, i) => {
    const dayNum = 73 + i;
    const phases = ['Resilience', 'Resilience', 'Integration', 'Integration', 'Resilience', 'Integration', 'Resilience', 'Integration', 'Integration'];
    const phase = phases[Math.floor(i / 2)] || 'Integration';
    const weekInPhase = Math.floor(i / 2) + 1;
    return {
      day_number: dayNum,
      title: `Day ${dayNum} Practice`,
      phase,
      week: weekInPhase,
      lesson_content: 'Continue building your emotional control skills with today\'s focused practice.',
      drill_instructions: '1. Find a quiet space\n2. Practice today\'s technique for 10 minutes\n3. Notice your emotional state before and after',
      challenge: "Apply today's technique in one real situation.",
      reflection_prompt: "What did you notice about your emotional responses today?"
    };
  }),
];

// Build a lookup map for O(1) access
const DAY_MAP = new Map<number, DayContent>(PROGRAM_DAYS.map(d => [d.day_number, d]));

export function registerProgramRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/program/content — public, all days
  app.fastify.get('/api/program/content', {
    schema: {
      description: 'Get all 90 days of program content',
      tags: ['program'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'GET /api/program/content');
    return reply.send({ days: PROGRAM_DAYS });
  });

  // GET /api/program/content/:dayNumber — public for days 1-7, auth+premium for days 8-90
  app.fastify.get('/api/program/content/:dayNumber', {
    schema: {
      description: 'Get content for a specific day',
      tags: ['program'],
      params: {
        type: 'object',
        required: ['dayNumber'],
        properties: { dayNumber: { type: 'string', description: 'Day number (1-90)' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            day_number: { type: 'integer' },
            title: { type: 'string' },
            phase: { type: 'string' },
            week: { type: 'integer' },
            lesson_content: { type: 'string' },
            drill_instructions: { type: 'string' },
            challenge: { type: 'string' },
            reflection_prompt: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            reason: { type: 'string' },
            days_1_7_access: { type: 'boolean' },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { dayNumber } = request.params as { dayNumber: string };
    const num = parseInt(dayNumber, 10);

    app.logger.info({ dayNumber: num }, 'GET /api/program/content/:dayNumber');

    const day = DAY_MAP.get(num);
    if (!day) {
      app.logger.warn({ dayNumber: num }, 'Day not found');
      return reply.status(404).send({ error: 'day_not_found' });
    }

    // Days 8-90 require auth and premium
    if (num > 7) {
      const session = await requireAuth(request, reply);
      if (!session) return; // requireAuth already sent 401

      const isPremium = await getUserIsPremium(app, session.user.id);
      if (!isPremium) {
        app.logger.warn({ userId: session.user.id, dayNumber: num }, 'Premium required for day');
        return reply.status(403).send({
          error: 'premium_required',
          reason: 'days_8_90_require_premium',
          days_1_7_access: true,
        });
      }
    }

    app.logger.info({ dayNumber: num }, 'Day content retrieved');
    return reply.send(day);
  });

  // GET /api/program/days — auth required, all user day progress
  app.fastify.get('/api/program/days', {
    schema: {
      description: 'Get all day progress for the authenticated user',
      tags: ['program'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'GET /api/program/days');

    const userId = session.user.id;
    const records = await app.db
      .select()
      .from(schema.userDayProgress)
      .where(eq(schema.userDayProgress.userId, userId));

    const days: DayProgressResponse[] = records.map(r => ({
      day_number: r.dayNumber,
      completed: r.completed,
      lesson_read: r.lessonRead,
      drill_completed: r.drillCompleted,
      reflection_text: r.reflectionText ?? undefined,
      completed_at: r.completedAt?.toISOString() ?? undefined,
    }));

    app.logger.info({ userId, count: records.length }, 'Day progress retrieved');
    return reply.send({ days });
  });

  // GET /api/program/days/:dayNumber — auth required, single day progress
  // Days 8-90: also check premium entitlement
  app.fastify.get('/api/program/days/:dayNumber', {
    schema: {
      description: 'Get progress for a specific day',
      tags: ['program'],
      params: {
        type: 'object',
        required: ['dayNumber'],
        properties: { dayNumber: { type: 'string', description: 'Day number (1-90)' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            day_number: { type: 'integer' },
            completed: { type: 'boolean' },
            lesson_read: { type: 'boolean' },
            drill_completed: { type: 'boolean' },
            reflection_text: { type: 'string', nullable: true },
            completed_at: { type: 'string', nullable: true },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' }, reason: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { dayNumber } = request.params as { dayNumber: string };
    const num = parseInt(dayNumber, 10);

    app.logger.info({ userId, dayNumber: num }, 'GET /api/program/days/:dayNumber');

    // Premium gate for days 8-90
    if (num > 7) {
      const isPremium = await checkPremiumEntitlementLocal(app, userId);
      if (!isPremium) {
        app.logger.warn({ userId, dayNumber: num }, 'Premium required');
        return reply.status(403).send({
          error: 'premium_required',
          reason: 'days_8_90_require_premium',
        });
      }
    }

    const records = await app.db
      .select()
      .from(schema.userDayProgress)
      .where(and(
        eq(schema.userDayProgress.userId, userId),
        eq(schema.userDayProgress.dayNumber, num)
      ))
      .limit(1);

    if (!records.length) {
      app.logger.warn({ userId, dayNumber: num }, 'Day progress not found');
      return reply.status(404).send({ error: 'not_found' });
    }

    const r = records[0];
    app.logger.info({ userId, dayNumber: num }, 'Day progress retrieved');
    return reply.send({
      day_number: r.dayNumber,
      completed: r.completed,
      lesson_read: r.lessonRead,
      drill_completed: r.drillCompleted,
      reflection_text: r.reflectionText ?? undefined,
      completed_at: r.completedAt?.toISOString() ?? undefined,
    } as DayProgressResponse);
  });

  // PATCH /api/program/days/:dayNumber — auth required, upsert lesson_read / drill_completed
  // Days 8-90: premium gate. All days: sequential progression gate.
  app.fastify.patch('/api/program/days/:dayNumber', {
    schema: {
      description: 'Update lesson_read and/or drill_completed for a day',
      tags: ['program'],
      params: {
        type: 'object',
        required: ['dayNumber'],
        properties: { dayNumber: { type: 'string', description: 'Day number (1-90)' } },
      },
      body: {
        type: 'object',
        properties: {
          lesson_read: { type: 'boolean' },
          drill_completed: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            day_number: { type: 'integer' },
            completed: { type: 'boolean' },
            lesson_read: { type: 'boolean' },
            drill_completed: { type: 'boolean' },
            reflection_text: { type: 'string', nullable: true },
            completed_at: { type: 'string', nullable: true },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            reason: { type: 'string' },
            required_day: { type: 'integer', nullable: true },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { dayNumber } = request.params as { dayNumber: string };
    const num = parseInt(dayNumber, 10);

    app.logger.info({ userId, dayNumber: num, body: request.body }, 'PATCH /api/program/days/:dayNumber');

    if (!Number.isInteger(num) || num < 1 || num > 90) {
      app.logger.warn({ dayNumber: num }, 'Invalid day number');
      return reply.status(400).send({ error: 'day_number must be between 1 and 90' });
    }

    // Premium gate for days 8-90
    if (num > 7) {
      const isPremium = await getUserIsPremium(app, userId);
      if (!isPremium) {
        app.logger.warn({ userId, dayNumber: num }, 'Premium required for PATCH');
        return reply.status(403).send({
          error: 'premium_required',
          reason: 'days_8_90_require_premium',
        });
      }
    }

    // Sequential progression gate: day N requires day N-1 to be completed
    const prevCompleted = await getPrevDayCompleted(app, userId, num);
    if (!prevCompleted) {
      app.logger.warn({ userId, dayNumber: num, requiredDay: num - 1 }, 'Progression required');
      return reply.status(403).send({
        error: 'progression_required',
        reason: 'complete_previous_day_first',
        required_day: num - 1,
      });
    }

    const body = request.body as { lesson_read?: boolean; drill_completed?: boolean };
    const now = new Date();

    // Try to find existing record
    const existing = await app.db
      .select()
      .from(schema.userDayProgress)
      .where(and(
        eq(schema.userDayProgress.userId, userId),
        eq(schema.userDayProgress.dayNumber, num)
      ))
      .limit(1);

    let record;
    if (existing.length === 0) {
      const inserted = await app.db
        .insert(schema.userDayProgress)
        .values({
          userId,
          dayNumber: num,
          lessonRead: body.lesson_read ?? false,
          drillCompleted: body.drill_completed ?? false,
          completed: false,
          updatedAt: now,
        })
        .returning();
      record = inserted[0];
      app.logger.info({ userId, dayNumber: num, record }, 'Day progress created');
    } else {
      const updateData: Record<string, any> = { updatedAt: now };
      if (body.lesson_read !== undefined) updateData.lessonRead = body.lesson_read;
      if (body.drill_completed !== undefined) updateData.drillCompleted = body.drill_completed;

      const updated = await app.db
        .update(schema.userDayProgress)
        .set(updateData)
        .where(and(
          eq(schema.userDayProgress.userId, userId),
          eq(schema.userDayProgress.dayNumber, num)
        ))
        .returning();
      record = updated[0];
      app.logger.info({ userId, dayNumber: num, record }, 'Day progress updated');
    }

    return reply.send({
      day_number: record.dayNumber,
      completed: record.completed,
      lesson_read: record.lessonRead,
      drill_completed: record.drillCompleted,
      reflection_text: record.reflectionText ?? undefined,
      completed_at: record.completedAt?.toISOString() ?? undefined,
    } as DayProgressResponse);
  });

  // POST /api/program/days/:dayNumber/complete — auth required, mark day complete
  // Days 8-90: premium gate. All days: sequential progression gate.
  app.fastify.post('/api/program/days/:dayNumber/complete', {
    schema: {
      description: 'Mark a day as complete',
      tags: ['program'],
      params: {
        type: 'object',
        required: ['dayNumber'],
        properties: { dayNumber: { type: 'string', description: 'Day number (1-90)' } },
      },
      body: {
        type: 'object',
        properties: {
          reflection_text: { type: 'string', maxLength: 2000 },
          emotional_identification: { type: 'integer', minimum: 0, maximum: 10 },
          response_control: { type: 'integer', minimum: 0, maximum: 10 },
          confidence_composure: { type: 'integer', minimum: 0, maximum: 10 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            day_progress: {
              type: 'object',
              properties: {
                day_number: { type: 'integer' },
                completed: { type: 'boolean' },
                lesson_read: { type: 'boolean' },
                drill_completed: { type: 'boolean' },
                reflection_text: { type: 'string', nullable: true },
                completed_at: { type: 'string', nullable: true },
              },
            },
            streak: { type: 'integer' },
            xp_earned: { type: 'integer' },
            achievements_unlocked: { type: 'array', items: { type: 'string' } },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            reason: { type: 'string' },
            required_day: { type: 'integer', nullable: true },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { dayNumber } = request.params as { dayNumber: string };
    const num = parseInt(dayNumber, 10);

    app.logger.info({ userId, dayNumber: num, body: request.body }, 'POST /api/program/days/:dayNumber/complete');

    if (!Number.isInteger(num) || num < 1 || num > 90) {
      app.logger.warn({ dayNumber: num }, 'Invalid day number for complete');
      return reply.status(400).send({ error: 'day_number must be between 1 and 90' });
    }

    const body = request.body as {
      reflection_text?: string;
      emotional_identification?: number;
      response_control?: number;
      confidence_composure?: number;
    };

    if (body.emotional_identification !== undefined && (body.emotional_identification < 0 || body.emotional_identification > 10)) {
      app.logger.warn({ emotional_identification: body.emotional_identification }, 'Invalid emotional_identification');
      return reply.status(400).send({ error: 'emotional_identification must be between 0 and 10' });
    }
    if (body.response_control !== undefined && (body.response_control < 0 || body.response_control > 10)) {
      app.logger.warn({ response_control: body.response_control }, 'Invalid response_control');
      return reply.status(400).send({ error: 'response_control must be between 0 and 10' });
    }
    if (body.confidence_composure !== undefined && (body.confidence_composure < 0 || body.confidence_composure > 10)) {
      app.logger.warn({ confidence_composure: body.confidence_composure }, 'Invalid confidence_composure');
      return reply.status(400).send({ error: 'confidence_composure must be between 0 and 10' });
    }

    // Premium gate for days 8-90
    if (num > 7) {
      const isPremium = await getUserIsPremium(app, userId);
      if (!isPremium) {
        app.logger.warn({ userId, dayNumber: num }, 'Premium required for complete');
        return reply.status(403).send({
          error: 'premium_required',
          reason: 'days_8_90_require_premium',
        });
      }
    }

    // Sequential progression gate: day N requires day N-1 to be completed
    const prevCompleted = await getPrevDayCompleted(app, userId, num);
    if (!prevCompleted) {
      app.logger.warn({ userId, dayNumber: num, requiredDay: num - 1 }, 'Progression required for complete');
      return reply.status(403).send({
        error: 'progression_required',
        reason: 'complete_previous_day_first',
        required_day: num - 1,
      });
    }

    const now = new Date();

    // Upsert user_day_progress
    const existing = await app.db
      .select()
      .from(schema.userDayProgress)
      .where(and(
        eq(schema.userDayProgress.userId, userId),
        eq(schema.userDayProgress.dayNumber, num)
      ))
      .limit(1);

    const wasAlreadyCompleted = existing.length > 0 && existing[0].completed === true;

    let dayRecord;
    if (existing.length === 0) {
      const inserted = await app.db
        .insert(schema.userDayProgress)
        .values({
          userId,
          dayNumber: num,
          lessonRead: true,
          drillCompleted: true,
          completed: true,
          reflectionText: body.reflection_text ?? null,
          completedAt: now,
          updatedAt: now,
        })
        .returning();
      dayRecord = inserted[0];
      app.logger.info({ userId, dayNumber: num }, 'Day progress completed (new)');
    } else {
      const updated = await app.db
        .update(schema.userDayProgress)
        .set({
          completed: true,
          reflectionText: body.reflection_text ?? existing[0].reflectionText,
          completedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(schema.userDayProgress.userId, userId),
          eq(schema.userDayProgress.dayNumber, num)
        ))
        .returning();
      dayRecord = updated[0];
      app.logger.info({ userId, dayNumber: num }, `Day progress completed (${wasAlreadyCompleted ? 'already completed' : 'updated'})`);
    }

    // Insert assessment if scores provided
    if (
      body.emotional_identification !== undefined &&
      body.response_control !== undefined &&
      body.confidence_composure !== undefined
    ) {
      const overall = Math.round(
        (body.emotional_identification + body.response_control + body.confidence_composure) / 3
      );
      await app.db.insert(schema.userAssessments).values({
        userId,
        emotionalIdentification: body.emotional_identification,
        responseControl: body.response_control,
        confidenceComposure: body.confidence_composure,
        overallScore: overall,
        assessmentType: 'progress',
      });
      app.logger.info({ userId, dayNumber: num, overallScore: overall }, 'Assessment recorded');
    }

    // Get or create user_progress
    const progressRecords = await app.db
      .select()
      .from(schema.userProgress)
      .where(eq(schema.userProgress.userId, userId))
      .limit(1);

    const XP_PER_DAY = 50;
    let newStreak = 1;
    let newLongestStreak = 1;
    let newTotalDays = 1;
    let newTotalXp = XP_PER_DAY;
    let xpEarned = XP_PER_DAY;
    let newCurrentDay = Math.min(num + 1, 90);
    let newWeeklyCompletion: boolean[] = [false, false, false, false, false, false, true];

    if (progressRecords.length > 0) {
      const prog = progressRecords[0];
      const lastCompleted = prog.lastCompletedAt;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Streak logic
      if (!lastCompleted) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastCompleted);
        lastDate.setHours(0, 0, 0, 0);
        if (lastDate.getTime() === today.getTime()) {
          newStreak = prog.currentStreak;
        } else if (lastDate.getTime() === yesterday.getTime()) {
          newStreak = prog.currentStreak + 1;
        } else {
          newStreak = 1;
        }
      }

      newLongestStreak = Math.max(prog.longestStreak, newStreak);

      if (wasAlreadyCompleted) {
        newTotalDays = prog.totalDaysCompleted;
        newTotalXp = prog.totalXp;
        xpEarned = 0;
      } else {
        newTotalDays = prog.totalDaysCompleted + 1;
        newTotalXp = prog.totalXp + XP_PER_DAY;
        xpEarned = XP_PER_DAY;
      }

      newCurrentDay = Math.min(Math.max(prog.currentDay, num + 1), 90);

      const prevWeekly = (prog.weeklyCompletion as boolean[]) || [];
      const padded = [...prevWeekly, ...Array(7).fill(false)].slice(-7);
      padded.shift();
      padded.push(true);
      newWeeklyCompletion = padded;

      await app.db
        .update(schema.userProgress)
        .set({
          currentDay: newCurrentDay,
          totalDaysCompleted: newTotalDays,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          totalXp: newTotalXp,
          weeklyCompletion: newWeeklyCompletion,
          lastCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.userProgress.userId, userId));
      app.logger.info({ userId, streak: newStreak, totalXp: newTotalXp }, 'Progress updated');
    } else {
      await app.db.insert(schema.userProgress).values({
        userId,
        currentDay: newCurrentDay,
        totalDaysCompleted: newTotalDays,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        totalXp: newTotalXp,
        weeklyCompletion: newWeeklyCompletion,
        lastCompletedAt: now,
      });
      app.logger.info({ userId, streak: newStreak, totalXp: newTotalXp }, 'Progress created');
    }

    app.logger.info({ userId, dayNumber: num, xpEarned }, 'Day completion processed');
    return reply.send({
      day_progress: {
        day_number: dayRecord.dayNumber,
        completed: dayRecord.completed,
        lesson_read: dayRecord.lessonRead,
        drill_completed: dayRecord.drillCompleted,
        reflection_text: dayRecord.reflectionText ?? undefined,
        completed_at: dayRecord.completedAt?.toISOString() ?? undefined,
      } as DayProgressResponse,
      streak: newStreak,
      xp_earned: xpEarned,
      achievements_unlocked: [] as string[],
    });
  });
}
