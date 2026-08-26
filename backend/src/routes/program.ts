import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { computeEntitlement, userIsPremium } from '../lib/entitlement.js';

async function getPrevDayCompleted(app: App, userId: string, dayNum: number): Promise<boolean> {
  if (dayNum <= 1) return true;
  const rows = await app.db.select().from(schema.userDayProgress)
    .where(and(eq(schema.userDayProgress.userId, userId), eq(schema.userDayProgress.dayNumber, dayNum - 1))).limit(1);
  return rows.length > 0 && rows[0].completed === true;
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
  phase_number?: number;
  week: number;
  lesson_content: string;
  drill_instructions: string;
  challenge: string;
  reflection_prompt: string;
  estimated_time?: string;
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

// Centralized 8-phase registry — single source of truth
export const PHASE_REGISTRY = [
  { phase: 1, key: 'Emotional Control',    label: 'Emotional Control',    daysStart: 1,  daysEnd: 12, color: '#6B4CE6', emoji: '🧘', description: 'Build awareness and regulation of your emotional responses.' },
  { phase: 2, key: 'Confidence',           label: 'Confidence',           daysStart: 13, daysEnd: 24, color: '#FFB84D', emoji: '⭐', description: 'Develop unshakeable self-belief and composure under pressure.' },
  { phase: 3, key: 'Anger Management',     label: 'Anger Management',     daysStart: 25, daysEnd: 36, color: '#E74C3C', emoji: '🌊', description: 'Transform anger into constructive energy and calm responses.' },
  { phase: 4, key: 'Stress Management',    label: 'Stress Management',    daysStart: 37, daysEnd: 48, color: '#3B82F6', emoji: '🍃', description: 'Build resilience and practical tools for managing stress.' },
  { phase: 5, key: 'Social Anxiety',       label: 'Social Anxiety',       daysStart: 49, daysEnd: 60, color: '#F5A623', emoji: '🤝', description: 'Reduce social fear and build genuine connection skills.' },
  { phase: 6, key: 'Thought Regulation',   label: 'Thought Regulation',   daysStart: 61, daysEnd: 72, color: '#27AE60', emoji: '🧠', description: 'Master your inner narrative and break unhelpful thought patterns.' },
  { phase: 7, key: 'Organization Skills',  label: 'Organization Skills',  daysStart: 73, daysEnd: 81, color: '#1ABC9C', emoji: '📋', description: 'Build practical systems for clarity, focus, and sustainable productivity.' },
  { phase: 8, key: 'Communication Skills', label: 'Communication Skills', daysStart: 82, daysEnd: 90, color: '#9B59B6', emoji: '💬', description: 'Communicate clearly, assertively, and with genuine empathy.' },
];

function dayToPhaseKey(dayNumber: number): string {
  for (const p of PHASE_REGISTRY) {
    if (dayNumber >= p.daysStart && dayNumber <= p.daysEnd) return p.key;
  }
  return 'Emotional Control';
}

function dayToPhaseNumber(dayNumber: number): number {
  for (const p of PHASE_REGISTRY) {
    if (dayNumber >= p.daysStart && dayNumber <= p.daysEnd) return p.phase;
  }
  return 1;
}

// Build the 90-day content array from the techniques data
const PROGRAM_DAYS_RAW: DayContent[] = [
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
  // Phase 7 — Organization Skills (Days 73–81)
  {
    day_number: 73, title: 'Personal Organization Baseline and Friction Audit',
    phase: 'Organization Skills', phase_number: 7, week: 13, estimated_time: '5–10 minutes',
    lesson_content: 'Most disorganization is not a character flaw — it is friction. Friction is anything that makes a task harder to start or finish than it needs to be. Today you will observe your own patterns without judgment. You are not diagnosing yourself; you are gathering information. Notice where things pile up, where you lose track, and where you feel most overwhelmed. That is your friction map — the starting point for building a system that actually fits your life.\n\nObjective: Identify your top three friction points in daily organization.',
    drill_instructions: 'Set a timer for 5 minutes.\nWalk through your day mentally from waking to sleeping.\nWrite down (or voice-note) three moments where you felt stuck, lost track of something, or had to search for information.\nFor each friction point, note: What was the task? What made it hard to start or finish?\nNo solutions yet — just honest observation.',
    challenge: 'Today, when you notice a friction moment in real life, pause and name it: "This is friction." Do not fix it yet — just notice it.',
    reflection_prompt: 'What were your three friction points? Was anything surprising about what you noticed?'
  },
  {
    day_number: 74, title: 'Values-Based Priorities',
    phase: 'Organization Skills', phase_number: 7, week: 13, estimated_time: '5–10 minutes',
    lesson_content: 'Not everything on your to-do list deserves equal attention. When everything feels urgent, nothing gets done well. Values-based prioritization means asking: which tasks move me toward what actually matters to me — not what feels pressing in the moment? This is not about productivity for its own sake. It is about spending your limited energy on things that align with your real goals and values.\n\nObjective: Distinguish between urgent-feeling tasks and genuinely important ones.',
    drill_instructions: 'Write down everything you feel you need to do today or this week — do not filter.\nFor each item, ask: If I do this, does it move me toward something I genuinely care about?\nSort into three groups: High alignment (matters to me), Low alignment (feels urgent but is not important to me), Unclear.\nChoose one High alignment task to protect time for today.\nNote: It is okay if most items are Unclear — that is useful information.',
    challenge: 'Before starting any task today, take 10 seconds to ask: Is this high alignment or am I just responding to urgency?',
    reflection_prompt: 'Which task did you protect time for? How did it feel to consciously choose it over other demands?'
  },
  {
    day_number: 75, title: 'Breaking Tasks into Next Actions',
    phase: 'Organization Skills', phase_number: 7, week: 13, estimated_time: '5–10 minutes',
    lesson_content: 'Vague tasks create paralysis. "Sort out finances" or "deal with the email backlog" are not tasks — they are outcomes. A next action is the smallest, most concrete physical step you could take right now. When you know exactly what to do next, starting becomes much easier. This skill is especially useful for tasks you have been avoiding.\n\nObjective: Convert at least one stuck or avoided task into a clear next action.',
    drill_instructions: 'Pick one task you have been avoiding or that feels overwhelming.\nAsk: What is the very next physical action I would need to take to move this forward?\nWrite that action as a specific verb + object: "Open the document," "Send one email to X," "Find the receipt in the folder."\nSet a timer for 2 minutes and do only that one action.\nAfter 2 minutes, stop — or continue if you want to. The goal was just to start.',
    challenge: 'For any task you feel resistance toward today, write the next action before deciding whether to do it.',
    reflection_prompt: 'What task did you break down? Did naming the next action change how you felt about starting it?'
  },
  {
    day_number: 76, title: 'Time Estimation and Realistic Planning',
    phase: 'Organization Skills', phase_number: 7, week: 14, estimated_time: '5–10 minutes',
    lesson_content: 'Most people underestimate how long tasks take — this is called the planning fallacy. It is not a personal failing; it is a well-documented cognitive pattern. Realistic planning means building in buffers, accounting for interruptions, and being honest about your energy levels at different times of day. A plan that fits your real life is more useful than an ideal plan you cannot follow.\n\nObjective: Practice estimating task duration and compare it to actual time taken.',
    drill_instructions: 'Choose 3 tasks you plan to do today.\nBefore starting each one, write down your estimate: "I think this will take ___ minutes."\nTime yourself doing each task.\nAfter all three, compare estimate vs. actual.\nNote: Were you consistently over or under? At what time of day were you most accurate?',
    challenge: 'When planning tomorrow, add a 25% buffer to your time estimates for each task.',
    reflection_prompt: 'How accurate were your estimates? What surprised you about how long things actually took?'
  },
  {
    day_number: 77, title: 'Focused Work and Distraction Design',
    phase: 'Organization Skills', phase_number: 7, week: 14, estimated_time: '5–10 minutes',
    lesson_content: 'Focus is not a personality trait — it is an environment you design. Distractions are not a sign of weakness; they are a sign that your environment has not been set up to support concentration. Today you will experiment with one focused work session and notice what helps and what gets in the way. You do not need to eliminate all distractions — you need to reduce the ones that matter most to you.\n\nObjective: Complete one focused work session and identify your top distraction.',
    drill_instructions: 'Choose one task that requires concentration.\nBefore starting: put your phone face-down or in another room, close unneeded browser tabs, and note your start time.\nWork for 20 minutes without switching tasks. If you get distracted, note what pulled your attention and return to the task — no self-criticism.\nAfter 20 minutes, write down: What distracted you? What helped you stay focused?\nAlternative if 20 minutes is not possible: try 10 minutes. The length matters less than the observation.',
    challenge: 'Identify your single biggest distraction today and change one thing about your environment to reduce it.',
    reflection_prompt: 'What was your top distraction? What one environmental change made the biggest difference?'
  },
  {
    day_number: 78, title: 'Creating Simple Routines and Cues',
    phase: 'Organization Skills', phase_number: 7, week: 14, estimated_time: '5–10 minutes',
    lesson_content: 'Routines reduce decision fatigue. When a sequence of actions becomes automatic, you spend less mental energy deciding what to do next. A cue is a trigger that starts a routine — a time, a location, or an action that signals "now I do this." Simple routines do not need to be elaborate. A two-step morning routine is more sustainable than a ten-step one you abandon after a week.\n\nObjective: Design one simple routine with a clear cue.',
    drill_instructions: 'Think of one recurring task you want to do more consistently (e.g., reviewing your to-do list, a short movement break, preparing for the next day).\nChoose a cue: a specific time, a location, or an existing habit you can attach it to (e.g., "after I make coffee").\nWrite the routine as: When [cue], I will [action], for [duration].\nTry it once today.\nNote: If the cue does not work, that is useful information — adjust it tomorrow.',
    challenge: 'Use your new cue today and notice whether it triggered the routine automatically or required effort.',
    reflection_prompt: 'What routine did you design? Did the cue work? What would you adjust?'
  },
  {
    day_number: 79, title: 'Organizing Physical and Digital Spaces Accessibly',
    phase: 'Organization Skills', phase_number: 7, week: 15, estimated_time: '5–10 minutes',
    lesson_content: 'An organized space is one where you can find what you need without searching. It does not need to look a certain way or meet anyone else\'s standard. Accessibility matters: a system that requires physical effort, fine motor precision, or visual scanning you find difficult is not a good system for you, regardless of how it looks. Today you will improve one small area — not your whole life, just one area.\n\nObjective: Improve one physical or digital space so that one frequently needed item is easier to find.\n\nNote: If physical organization is difficult due to mobility, energy, or executive function challenges, focus on a digital space (a folder, a bookmark, a note). Both are equally valid.',
    drill_instructions: 'Choose one small area: a drawer, a folder on your phone, your email inbox, your desktop, or a physical surface.\nRemove or archive anything you have not used in the past month.\nPlace the three most frequently used items in the most accessible position.\nLabel or name things clearly so future-you can find them without remembering a system.\nStop after 10 minutes — do not try to organize everything.',
    challenge: 'The next time you cannot find something, note where it was and where it should have been. That gap is your next organization target.',
    reflection_prompt: 'What area did you improve? What made it easier to find things? What would you do differently?'
  },
  {
    day_number: 80, title: 'Flexible Weekly Review and Reprioritization',
    phase: 'Organization Skills', phase_number: 7, week: 15, estimated_time: '5–10 minutes',
    lesson_content: 'A weekly review is not about judging how much you accomplished. It is about pausing to ask: what is still relevant, what has changed, and what do I want to focus on next? Flexibility is a feature, not a failure. Plans change because life changes. A review that takes 10 minutes and helps you feel oriented is more valuable than a perfect system you never use.\n\nObjective: Complete a brief weekly review and update your priorities.',
    drill_instructions: 'Set a timer for 10 minutes.\nAsk yourself three questions and write brief answers:\n1. What did I actually do this week that I feel good about?\n2. What is still unfinished and still matters?\n3. What is one thing I want to protect time for next week?\nUpdate your task list or notes based on your answers.\nNote: If you do not have a task list, a simple note on paper or your phone is enough.',
    challenge: 'Schedule your next weekly review right now — pick a day and time that is realistic for you.',
    reflection_prompt: 'What did you notice during your review? What shifted in your priorities?'
  },
  {
    day_number: 81, title: 'Organization Integration: Your System and Recovery Plan',
    phase: 'Organization Skills', phase_number: 7, week: 15, estimated_time: '5–10 minutes',
    lesson_content: 'You have spent nine days building awareness and experimenting with organization tools. Today is about integration: choosing what to keep, letting go of what did not fit, and planning for disruption. Disruption is inevitable — illness, unexpected demands, difficult periods. A good system is not one that never breaks; it is one you can return to after it breaks. Recovery is part of the system.\n\nObjective: Define your personal organization system and your recovery plan.',
    drill_instructions: 'Review the past nine days. Write down:\n1. One friction point you have reduced.\n2. One tool or habit that actually helped you (even a little).\n3. One thing you tried that did not fit — and that is okay to let go.\nWrite a one-sentence description of your personal organization approach: "My system is ___." It can be simple.\nWrite one sentence about how you will restart after a disruption: "When I fall off track, I will ___."',
    challenge: 'Share your one-sentence system with someone you trust, or write it somewhere you will see it.',
    reflection_prompt: 'What does your personal organization system look like now? How will you recover when it breaks down?'
  },
  // Phase 8 — Communication Skills (Days 82–90)
  {
    day_number: 82, title: 'Communication Baseline and Listening',
    phase: 'Communication Skills', phase_number: 8, week: 16, estimated_time: '5–10 minutes',
    lesson_content: 'Communication is not just speaking — it is the full loop of sending and receiving. Most communication problems happen in the receiving half: we listen to respond rather than to understand. Today you will observe your own communication patterns without judgment. You are not diagnosing yourself as a bad communicator; you are gathering information about where your patterns serve you and where they do not.\n\nObjective: Identify one communication pattern you want to understand better.',
    drill_instructions: 'In your next conversation today, practice listening to understand rather than to respond.\nNotice: Are you thinking about what to say while the other person is still speaking?\nAfter the conversation, write down: What did the other person actually say? What did you notice about your own listening?\nAlternative if you do not have a conversation today: recall a recent conversation and replay it in your mind with this question: Was I listening to understand or to respond?\nNote: This is observation only — no performance required.',
    challenge: 'In one conversation today, wait until the other person has fully finished before you begin forming your response.',
    reflection_prompt: 'What did you notice about your listening? Was there a moment where you caught yourself preparing a response instead of listening?'
  },
  {
    day_number: 83, title: 'Emotion Labeling Before Speaking',
    phase: 'Communication Skills', phase_number: 8, week: 16, estimated_time: '5–10 minutes',
    lesson_content: 'When we speak from unprocessed emotion, we often say things we do not mean or communicate in ways that create more conflict. Labeling your emotion before speaking — even silently — creates a brief pause that changes what you say and how you say it. This is not about suppressing emotion; it is about choosing how to express it. You do not need to share the label with anyone.\n\nObjective: Practice labeling your emotion before responding in at least one interaction.',
    drill_instructions: 'Before your next emotionally charged interaction (or in a recalled one), pause and silently name what you are feeling: "I am feeling frustrated," "I am feeling anxious," "I am feeling dismissed."\nNotice: Does naming it change the intensity even slightly?\nWrite down the emotion you labeled and what you said or did next.\nAlternative: If you are not in a charged interaction today, practice with a low-stakes moment — a minor annoyance or frustration.',
    challenge: 'Today, before responding to any message or request that triggers a reaction, pause for 5 seconds and name the emotion first.',
    reflection_prompt: 'What emotion did you label? Did naming it change how you responded?'
  },
  {
    day_number: 84, title: 'Clear "I" Statements and Specific Requests',
    phase: 'Communication Skills', phase_number: 8, week: 16, estimated_time: '5–10 minutes',
    lesson_content: '"You always do this" creates defensiveness. "I feel frustrated when meetings run over because I lose my afternoon focus" is specific, owned, and actionable. "I" statements describe your experience without blaming. Specific requests tell the other person exactly what would help — not what they should stop doing, but what you are asking for. Both skills reduce conflict and increase the chance of being understood.\n\nObjective: Practice forming one "I" statement and one specific request.',
    drill_instructions: 'Think of a situation where you want to communicate a need or concern.\nWrite an "I" statement using this structure: "I feel [emotion] when [specific situation] because [impact on me]."\nWrite a specific request: "What I am asking for is [concrete, observable action]."\nRead both aloud or to yourself. Notice: Does it feel honest? Does it feel fair?\nYou do not need to send or say this today — the practice is in the writing.\nAlternative: If no current situation comes to mind, use a past one.',
    challenge: 'In one real interaction today, replace a "you" accusation with an "I" statement.',
    reflection_prompt: 'What did you write? How did forming the "I" statement change how you thought about the situation?'
  },
  {
    day_number: 85, title: 'Assertive Communication: Not Passive, Not Aggressive',
    phase: 'Communication Skills', phase_number: 8, week: 17, estimated_time: '5–10 minutes',
    lesson_content: 'Assertive communication means expressing your needs, opinions, and boundaries clearly and respectfully — without aggression and without self-erasure. Passive communication leaves your needs unmet. Aggressive communication damages relationships. Assertive communication is a skill, not a personality type. It can be learned, and it looks different in different contexts and cultures. Today you will practice recognizing the difference.\n\nObjective: Identify one situation where you tend toward passive or aggressive communication and practice an assertive alternative.',
    drill_instructions: 'Think of a recent situation where you either said nothing when you wanted to speak (passive) or spoke in a way that felt too forceful (aggressive).\nWrite what you actually said (or did not say).\nNow write an assertive version: clear, specific, respectful, and honest.\nNotice: What would have made the assertive version hard to say in that moment?\nAlternative: If no situation comes to mind, use a hypothetical: "If someone took credit for my work, I would assertively say..."',
    challenge: 'Today, in one low-stakes situation, practice saying what you actually think or need — clearly and respectfully.',
    reflection_prompt: 'What situation did you work with? What made the assertive version feel different from what you actually said?'
  },
  {
    day_number: 86, title: 'Boundaries and Respectful Refusal',
    phase: 'Communication Skills', phase_number: 8, week: 17, estimated_time: '5–10 minutes',
    lesson_content: 'A boundary is not a wall — it is information about what you need to function well. Saying no is not selfish; it is honest. Respectful refusal means declining clearly without over-explaining, apologizing excessively, or leaving the other person confused. You do not owe anyone a detailed justification for your limits. A simple, clear no is a complete sentence.\n\nObjective: Practice one clear, respectful refusal — real or rehearsed.\n\nSafety note: If saying no in your current environment carries real risk — to your safety, housing, or employment — please prioritize your safety. You can rehearse privately, choose written communication, or delay. These skills are options, not obligations.',
    drill_instructions: 'Think of a request you want to decline or have recently declined awkwardly.\nWrite a refusal using this structure: "I am not able to [request]. [Optional: one-sentence reason if you choose to share it.]"\nPractice saying it aloud — to yourself, to a mirror, or to a trusted person.\nNotice: What makes it hard to say no in this situation? Is it fear of conflict, guilt, or something else?\nAlternative: If no current situation applies, rehearse a hypothetical refusal.',
    challenge: 'Today, decline one request — however small — without over-explaining or apologizing.',
    reflection_prompt: 'What did you decline or rehearse declining? What made it feel difficult or easier than expected?'
  },
  {
    day_number: 87, title: 'Clarifying Assumptions and Repairing Misunderstandings',
    phase: 'Communication Skills', phase_number: 8, week: 17, estimated_time: '5–10 minutes',
    lesson_content: 'Most conflict is not about facts — it is about assumptions. We assume we know what someone meant, what they intended, or how they feel. Checking assumptions before reacting reduces unnecessary conflict. Repairing a misunderstanding — acknowledging it and clarifying — is a communication skill, not an admission of failure. It takes more courage to repair than to avoid.\n\nObjective: Practice one clarifying question and one repair statement.',
    drill_instructions: 'Think of a recent misunderstanding or a situation where you assumed something about another person\'s meaning or intent.\nWrite a clarifying question you could have asked: "When you said [X], did you mean [Y]?"\nWrite a repair statement: "I think I misunderstood what you meant. What I heard was [X] — is that what you intended?"\nAlternative: If no recent misunderstanding comes to mind, use a hypothetical.\nNote: You do not need to send or say these today — the practice is in forming them.',
    challenge: 'In one interaction today, ask a clarifying question before assuming you understood.',
    reflection_prompt: 'What assumption did you examine? How did forming the clarifying question change your perspective?'
  },
  {
    day_number: 88, title: 'Difficult Conversations with Safety-Based Alternatives',
    phase: 'Communication Skills', phase_number: 8, week: 18, estimated_time: '5–10 minutes',
    lesson_content: 'Difficult conversations are ones where the stakes feel high — where you fear conflict, rejection, or consequences. Preparing for a difficult conversation does not mean scripting it perfectly; it means knowing your goal, your bottom line, and your exit if needed. Not every difficult conversation needs to happen immediately, in person, or at all. Written communication, delay, or choosing not to engage are all valid options — especially when safety is a concern.\n\nObjective: Prepare for one difficult conversation — or identify a safer alternative.\n\nSafety note: If a conversation carries risk to your physical safety, housing, or wellbeing, please do not feel obligated to have it. Choosing written communication, seeking support from a trusted person or professional, or deciding not to engage are all legitimate choices.',
    drill_instructions: 'Identify one difficult conversation you have been avoiding or need to have.\nWrite down: What is my goal for this conversation? What is the minimum outcome I need? What will I do if the conversation becomes unsafe or unproductive?\nWrite an opening sentence that is honest and non-accusatory.\nAlternative options to consider: Could this be communicated in writing? Could I delay until I feel safer? Is there a support person I could involve?\nNote: You do not need to have this conversation today.',
    challenge: 'Choose one of these: have the conversation, write a draft message, or identify one support resource for this situation.',
    reflection_prompt: 'What conversation did you prepare for? What felt most difficult about it? What alternative felt most realistic?'
  },
  {
    day_number: 89, title: 'Feedback, Empathy, and Perspective-Taking',
    phase: 'Communication Skills', phase_number: 8, week: 18, estimated_time: '5–10 minutes',
    lesson_content: 'Empathy does not mean agreeing. You can understand someone\'s perspective without endorsing it. Giving feedback means sharing your honest observation in a way the other person can hear — not to change them, but to communicate clearly. Receiving feedback means listening without immediately defending. Both skills require tolerating discomfort. Neither requires you to abandon your own perspective.\n\nObjective: Practice giving or receiving feedback with empathy and without forced agreement.',
    drill_instructions: 'Think of a situation where you want to give feedback to someone, or where you recently received feedback.\nFor giving feedback: write it using this structure: "I noticed [specific observation]. The impact on me was [honest effect]. I am sharing this because [genuine reason]."\nFor receiving feedback: write down the feedback you received. Then write: "What might be true about this, even if I disagree with how it was delivered?"\nAlternative: If neither applies, write feedback you would give yourself about your communication this week.\nNote: You do not need to share this with anyone.',
    challenge: 'In one interaction today, try to understand the other person\'s perspective before responding — even if you disagree.',
    reflection_prompt: 'What feedback did you work with? What was it like to look for what might be true without having to agree?'
  },
  {
    day_number: 90, title: '90-Day Integration: Your Communication Plan and Journey Reflection',
    phase: 'Communication Skills', phase_number: 8, week: 18, estimated_time: '10–15 minutes',
    lesson_content: 'You have completed 90 days of deliberate practice across eight areas of emotional and interpersonal skill. Today is not an ending — it is a transition. The skills you have built are not fixed; they require ongoing practice, and they will sometimes break down. That is normal. A maintenance plan is not about perfection; it is about knowing which practices to return to when things get hard.\n\nToday you will write your personal communication plan and reflect on your 90-day journey.\n\nObjective: Define your communication strengths, your growth areas, and your maintenance plan.',
    drill_instructions: 'Take 10 minutes and write responses to these prompts:\n1. Communication strength: "One communication skill I have genuinely improved is ___. I know this because ___.\n2. Growth area: "One area I want to keep working on is ___.\n3. Maintenance: "When communication gets hard, I will return to ___. My first step will be ___.\n4. 90-day reflection: "The most important thing I learned about myself in these 90 days is ___.\nNote: There are no right answers. This is your honest reflection.',
    challenge: 'Share one thing you learned about yourself in these 90 days with someone you trust — or write it somewhere you will see it.',
    reflection_prompt: 'What is the most important thing you learned about yourself in these 90 days? What will you carry forward?'
  },
];

// Build PROGRAM_DAYS with normalized phase strings and phase_number from the registry
const PROGRAM_DAYS: DayContent[] = PROGRAM_DAYS_RAW.map(d => ({
  ...d,
  phase: dayToPhaseKey(d.day_number),
  phase_number: dayToPhaseNumber(d.day_number),
}));

// Build a lookup map for O(1) access
const DAY_MAP = new Map<number, DayContent>(PROGRAM_DAYS.map(d => [d.day_number, d]));

export function registerProgramRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/program/phases — public, returns 8-phase registry
  app.fastify.get('/api/program/phases', {
    schema: {
      description: 'Get the 8-phase program registry',
      tags: ['program'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'GET /api/program/phases');
    return reply.send({ phases: PHASE_REGISTRY });
  });

  // GET /api/program/catalog — public, preview metadata only (no lesson body)
  app.fastify.get('/api/program/catalog', {
    schema: {
      description: 'Public catalog: day titles, phase, estimated time, lock status only',
      tags: ['program'],
      response: {
        200: {
          type: 'object',
          properties: {
            days: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day_number: { type: 'integer' },
                  title: { type: 'string' },
                  phase: { type: 'string' },
                  phase_number: { type: 'integer' },
                  week: { type: 'integer' },
                  estimated_time: { type: 'string' },
                  is_premium: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'GET /api/program/catalog');
    const catalog = PROGRAM_DAYS.map(d => ({
      day_number: d.day_number,
      title: d.title,
      phase: d.phase,
      phase_number: d.phase_number,
      week: d.week,
      estimated_time: d.estimated_time || '5–10 min',
      is_premium: d.day_number > 7,
    }));
    return reply.send({ days: catalog });
  });

  // GET /api/program/content — auth required, all days
  app.fastify.get('/api/program/content', {
    schema: {
      description: 'Auth required: all 90 days of program content',
      tags: ['program'],
      response: {
        200: {
          type: 'array',
          items: { type: 'object' },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'GET /api/program/content');
    return reply.send({ days: PROGRAM_DAYS });
  });

  // GET /api/program/content/:dayNumber — auth required for all days, premium for days 8-90
  app.fastify.get('/api/program/content/:dayNumber', {
    schema: {
      description: 'Get content for a specific day (auth required; premium required for days 8-90)',
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
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { dayNumber } = request.params as { dayNumber: string };
    const num = parseInt(dayNumber, 10);

    app.logger.info({ userId: session.user.id, dayNumber: num }, 'GET /api/program/content/:dayNumber');

    const day = DAY_MAP.get(num);
    if (!day) {
      app.logger.warn({ dayNumber: num }, 'Day not found');
      return reply.status(404).send({ error: 'day_not_found' });
    }

    // Days 8-90 require premium
    if (num > 7) {
      const isPremium = await userIsPremium(app, session.user.id);
      if (!isPremium) {
        app.logger.warn({ userId: session.user.id, dayNumber: num }, 'Premium required for day');
        return reply.status(403).send({
          error: 'premium_required',
          reason: 'days_8_90_require_premium',
          days_1_7_access: false,
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
      const isPremium = await userIsPremium(app, userId);
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
      const isPremium = await userIsPremium(app, userId);
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
      const isPremium = await userIsPremium(app, userId);
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
