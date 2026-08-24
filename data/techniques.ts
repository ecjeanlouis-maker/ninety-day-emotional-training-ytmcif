
import { Technique } from '@/types/program';

export const techniques: Technique[] = [
  // EMOTIONAL CONTROL TECHNIQUES (12 weeks)
  {
    id: 1,
    title: 'Deep Breathing Exercise',
    description: 'Practice 4-7-8 breathing technique to calm your nervous system.',
    practiceSteps: [
      'Inhale deeply through your nose for 4 seconds',
      'Hold your breath for 7 seconds',
      'Exhale slowly through your mouth for 8 seconds',
      'Repeat this cycle 5-10 times'
    ],
    goal: 'Calms the nervous system and reduces anxiety instantly',
    icon: 'air',
    category: 'emotional',
    practiceFrequency: 'Daily - Morning & Evening',
    week: 1
  },
  {
    id: 2,
    title: 'Emotion Journaling',
    description: 'Write down your emotions and triggers to understand patterns.',
    practiceSteps: [
      'Set aside 10 minutes each evening',
      'Write down emotions you experienced today',
      'Identify what triggered each emotion',
      'Note how you responded to each trigger'
    ],
    goal: 'Understanding patterns helps you respond rather than react',
    icon: 'edit',
    category: 'emotional',
    practiceFrequency: 'Daily - Evening',
    week: 2
  },
  {
    id: 3,
    title: 'Mindful Pause',
    description: 'Create space between stimulus and response.',
    practiceSteps: [
      'When emotions rise, stop immediately',
      'Take a deep breath and count to 10',
      'Observe your feelings without judgment',
      'Choose your response consciously'
    ],
    goal: 'Creates space between stimulus and response for better decisions',
    icon: 'pause-circle',
    category: 'emotional',
    practiceFrequency: 'As needed throughout day',
    week: 3
  },
  {
    id: 4,
    title: 'Progressive Muscle Relaxation',
    description: 'Release physical tension that accompanies emotional stress.',
    practiceSteps: [
      'Find a quiet place to sit or lie down',
      'Tense each muscle group for 5 seconds',
      'Release and notice the relaxation',
      'Move from head to toe systematically'
    ],
    goal: 'Releases physical tension that accompanies emotional stress',
    icon: 'fitness-center',
    category: 'emotional',
    practiceFrequency: '3x per week',
    week: 4
  },
  {
    id: 5,
    title: 'Emotion Labeling',
    description: 'Name your emotions specifically to reduce their intensity.',
    practiceSteps: [
      'When you feel an emotion, pause',
      'Name it specifically (not just "bad" or "good")',
      'Say it out loud or write it down',
      'Notice how naming it reduces intensity'
    ],
    goal: 'Research shows labeling reduces emotional intensity by 50%',
    icon: 'label',
    category: 'emotional',
    practiceFrequency: 'Throughout the day',
    week: 5
  },
  {
    id: 6,
    title: 'Reframing Thoughts',
    description: 'Challenge negative thoughts with evidence and perspective.',
    practiceSteps: [
      'Notice a negative thought',
      'Ask: Is this thought absolutely true?',
      'Look for evidence against the thought',
      'Find an alternative, balanced perspective'
    ],
    goal: 'Transforms negative thinking patterns into balanced perspectives',
    icon: 'refresh',
    category: 'emotional',
    practiceFrequency: 'When negative thoughts arise',
    week: 6
  },
  {
    id: 7,
    title: 'Grounding Technique',
    description: 'Use your senses to anchor yourself in the present moment.',
    practiceSteps: [
      'Name 5 things you can see',
      'Name 4 things you can hear',
      'Name 3 things you can feel',
      'Name 2 things you can smell',
      'Name 1 thing you can taste'
    ],
    goal: 'Anchors you in the present moment during anxiety or stress',
    icon: 'nature',
    category: 'emotional',
    practiceFrequency: 'During anxiety or stress',
    week: 7
  },
  {
    id: 8,
    title: 'Emotional Boundaries',
    description: 'Protect your emotional energy by setting healthy limits.',
    practiceSteps: [
      'Identify emotional demands that drain you',
      'Practice saying "no" without guilt',
      'Communicate your limits clearly',
      'Prioritize your emotional well-being'
    ],
    goal: 'Protects your emotional energy and prevents burnout',
    icon: 'block',
    category: 'emotional',
    practiceFrequency: 'As needed',
    week: 8
  },
  {
    id: 9,
    title: 'Body Scan Meditation',
    description: 'Build emotional awareness through body sensations.',
    practiceSteps: [
      'Lie down or sit comfortably',
      'Close your eyes and breathe naturally',
      'Scan from head to toe, noticing sensations',
      'Observe without trying to change anything'
    ],
    goal: 'Builds emotional awareness and mind-body connection',
    icon: 'self-improvement',
    category: 'emotional',
    practiceFrequency: 'Daily - 10 minutes',
    week: 9
  },
  {
    id: 10,
    title: 'Trigger Tracking',
    description: 'Identify patterns in what triggers emotional reactions.',
    practiceSteps: [
      'Keep a trigger log throughout the week',
      'Note situations that caused strong emotions',
      'Identify common patterns or themes',
      'Plan strategies for known triggers'
    ],
    goal: 'Awareness of triggers is the first step to emotional control',
    icon: 'analytics',
    category: 'emotional',
    practiceFrequency: 'Weekly review',
    week: 10
  },
  {
    id: 11,
    title: 'Compassionate Self-Talk',
    description: 'Replace harsh criticism with understanding and kindness.',
    practiceSteps: [
      'Notice when you&apos;re being self-critical',
      'Ask: Would I say this to a friend?',
      'Reframe with compassion and understanding',
      'Speak to yourself as you would to someone you love'
    ],
    goal: 'Replaces harsh self-criticism with supportive inner dialogue',
    icon: 'favorite-border',
    category: 'emotional',
    practiceFrequency: 'Throughout the day',
    week: 11
  },
  {
    id: 12,
    title: 'Emotional Mastery Integration',
    description: 'Combine all techniques into your daily routine.',
    practiceSteps: [
      'Review all 11 techniques you&apos;ve learned',
      'Choose 3-5 that work best for you',
      'Create a daily practice schedule',
      'Commit to consistent application'
    ],
    goal: 'You now have the tools to master any emotion that arises',
    icon: 'emoji-events',
    category: 'emotional',
    practiceFrequency: 'Daily practice',
    week: 12
  },
  // CONFIDENCE DEVELOPMENT TECHNIQUES (12 weeks)
  {
    id: 13,
    title: 'Positive Affirmations',
    description: 'Rewire your brain for confidence and self-belief.',
    practiceSteps: [
      'Write 5 positive statements about yourself',
      'Stand in front of a mirror each morning',
      'Speak each affirmation with conviction',
      'Feel the truth of each statement'
    ],
    goal: 'Rewires your brain for confidence and self-belief',
    icon: 'favorite',
    category: 'confidence',
    practiceFrequency: 'Daily - Morning',
    week: 1
  },
  {
    id: 14,
    title: 'Power Posing',
    description: 'Use body language to boost confidence hormones.',
    practiceSteps: [
      'Stand with feet shoulder-width apart',
      'Place hands on hips or raise arms in victory',
      'Hold the pose for 2 minutes',
      'Breathe deeply and feel powerful'
    ],
    goal: 'Increases testosterone and reduces cortisol for instant confidence',
    icon: 'accessibility',
    category: 'confidence',
    practiceFrequency: 'Daily - Before challenges',
    week: 2
  },
  {
    id: 15,
    title: 'Gratitude Practice',
    description: 'Shift focus from problems to possibilities.',
    practiceSteps: [
      'Each evening, write down 3 things you&apos;re grateful for',
      'Be specific about why you&apos;re grateful',
      'Include small and large things',
      'Feel the appreciation as you write'
    ],
    goal: 'Shifts focus from problems to possibilities and abundance',
    icon: 'star',
    category: 'confidence',
    practiceFrequency: 'Daily - Evening',
    week: 3
  },
  {
    id: 16,
    title: 'Visualization Success',
    description: 'Rehearse success to build neural pathways.',
    practiceSteps: [
      'Find a quiet place and close your eyes',
      'Visualize yourself succeeding in detail',
      'Engage all senses in the visualization',
      'Feel the emotions of success'
    ],
    goal: 'Your brain rehearses success, building confidence neural pathways',
    icon: 'visibility',
    category: 'confidence',
    practiceFrequency: 'Daily - Morning',
    week: 4
  },
  {
    id: 17,
    title: 'Small Wins Tracking',
    description: 'Build momentum and reinforce your capability.',
    practiceSteps: [
      'Each evening, record 3 small accomplishments',
      'Include tasks completed, challenges overcome',
      'Celebrate each win, no matter how small',
      'Review your wins weekly'
    ],
    goal: 'Builds momentum and reinforces your capability',
    icon: 'check-circle',
    category: 'confidence',
    practiceFrequency: 'Daily - Evening',
    week: 5
  },
  {
    id: 18,
    title: 'Comfort Zone Expansion',
    description: 'Grow confidence through action, not contemplation.',
    practiceSteps: [
      'Choose one thing that scares you slightly',
      'Plan when and how you&apos;ll do it',
      'Take action despite the fear',
      'Reflect on what you learned'
    ],
    goal: 'Confidence grows through action, not contemplation',
    icon: 'trending-up',
    category: 'confidence',
    practiceFrequency: 'Weekly challenge',
    week: 6
  },
  {
    id: 19,
    title: 'Skill Building',
    description: 'Build competence to breed confidence.',
    practiceSteps: [
      'Choose a skill you want to develop',
      'Dedicate 30 minutes daily to practice',
      'Track your progress and improvements',
      'Celebrate milestones along the way'
    ],
    goal: 'Competence breeds confidence in all areas of life',
    icon: 'school',
    category: 'confidence',
    practiceFrequency: 'Daily - 30 minutes',
    week: 7
  },
  {
    id: 20,
    title: 'Social Confidence Practice',
    description: 'Improve social skills through consistent practice.',
    practiceSteps: [
      'Set a goal to talk to 3 strangers this week',
      'Start with simple greetings or questions',
      'Practice active listening',
      'Notice your confidence growing'
    ],
    goal: 'Social skills improve with practice, building social confidence',
    icon: 'chat',
    category: 'confidence',
    practiceFrequency: '3x per week',
    week: 8
  },
  {
    id: 21,
    title: 'Body Language Mastery',
    description: 'Use confident body language to shape your mindset.',
    practiceSteps: [
      'Practice shoulders back, chest open',
      'Maintain eye contact in conversations',
      'Use a firm handshake',
      'Walk with purpose and energy'
    ],
    goal: 'Your body shapes your mind - confident posture creates confidence',
    icon: 'person',
    category: 'confidence',
    practiceFrequency: 'Throughout the day',
    week: 9
  },
  {
    id: 22,
    title: 'Public Speaking Practice',
    description: 'Build communication confidence through daily practice.',
    practiceSteps: [
      'Choose a topic and speak for 2 minutes',
      'Record yourself on video',
      'Watch and note areas to improve',
      'Practice again with improvements'
    ],
    goal: 'Communication confidence is key to overall confidence',
    icon: 'mic',
    category: 'confidence',
    practiceFrequency: 'Daily - 2 minutes',
    week: 10
  },
  {
    id: 23,
    title: 'Celebrate Your Progress',
    description: 'Build lasting confidence through self-recognition.',
    practiceSteps: [
      'Review your journey from week 1',
      'List all the progress you&apos;ve made',
      'Acknowledge how far you&apos;ve come',
      'Celebrate your commitment and growth'
    ],
    goal: 'Self-recognition builds lasting confidence and self-worth',
    icon: 'celebration',
    category: 'confidence',
    practiceFrequency: 'Weekly reflection',
    week: 11
  },
  {
    id: 24,
    title: 'Confidence Lifestyle Integration',
    description: 'Integrate all confidence techniques into your identity.',
    practiceSteps: [
      'Review all 11 confidence techniques',
      'Choose your top 5 daily practices',
      'Create a sustainable routine',
      'Commit to living as a confident person'
    ],
    goal: 'You are now a confident person - this is your new identity',
    icon: 'workspace-premium',
    category: 'confidence',
    practiceFrequency: 'Daily practice',
    week: 12
  },
  // ANGER MANAGEMENT TECHNIQUES (12 weeks)
  {
    id: 25,
    title: 'Anger Recognition',
    description: 'Identify early warning signs of anger before it escalates.',
    practiceSteps: [
      'Notice physical sensations (tension, heat, rapid heartbeat)',
      'Identify thoughts that trigger anger',
      'Rate your anger level from 1-10',
      'Record patterns in an anger journal'
    ],
    goal: 'Early recognition allows you to intervene before anger escalates',
    icon: 'warning',
    category: 'anger',
    practiceFrequency: 'Throughout the day',
    week: 1
  },
  {
    id: 26,
    title: 'Timeout Technique',
    description: 'Remove yourself from triggering situations to cool down.',
    practiceSteps: [
      'When anger rises, say "I need a timeout"',
      'Leave the situation for 15-20 minutes',
      'Practice deep breathing during timeout',
      'Return when you feel calmer'
    ],
    goal: 'Physical distance prevents reactive anger responses',
    icon: 'timer',
    category: 'anger',
    practiceFrequency: 'As needed',
    week: 2
  },
  {
    id: 27,
    title: 'Anger Thought Challenging',
    description: 'Question and reframe anger-inducing thoughts.',
    practiceSteps: [
      'Identify the thought fueling your anger',
      'Ask: Is this thought 100% accurate?',
      'Consider alternative explanations',
      'Replace with a balanced perspective'
    ],
    goal: 'Challenging thoughts reduces anger intensity and duration',
    icon: 'psychology',
    category: 'anger',
    practiceFrequency: 'When anger arises',
    week: 3
  },
  {
    id: 28,
    title: 'Physical Release Exercise',
    description: 'Channel anger energy through physical activity.',
    practiceSteps: [
      'Go for a brisk walk or run',
      'Do push-ups or jumping jacks',
      'Hit a punching bag or pillow',
      'Engage in any vigorous exercise'
    ],
    goal: 'Physical activity releases anger energy safely and effectively',
    icon: 'directions-run',
    category: 'anger',
    practiceFrequency: 'When anger is high',
    week: 4
  },
  {
    id: 29,
    title: 'Empathy Practice',
    description: 'See situations from others&apos; perspectives to reduce anger.',
    practiceSteps: [
      'Pause and consider the other person&apos;s viewpoint',
      'Ask: What might they be experiencing?',
      'Imagine their challenges and pressures',
      'Find compassion for their situation'
    ],
    goal: 'Empathy dissolves anger by creating understanding',
    icon: 'favorite-border',
    category: 'anger',
    practiceFrequency: 'During conflicts',
    week: 5
  },
  {
    id: 30,
    title: 'Assertive Communication',
    description: 'Express anger constructively without aggression.',
    practiceSteps: [
      'Use "I feel" statements instead of "You" accusations',
      'State your needs clearly and calmly',
      'Listen to the other person&apos;s response',
      'Work toward a solution together'
    ],
    goal: 'Assertiveness expresses anger productively without damaging relationships',
    icon: 'chat',
    category: 'anger',
    practiceFrequency: 'During disagreements',
    week: 6
  },
  {
    id: 31,
    title: 'Relaxation Response',
    description: 'Activate your body&apos;s natural calming system.',
    practiceSteps: [
      'Practice progressive muscle relaxation',
      'Use guided imagery of peaceful scenes',
      'Listen to calming music',
      'Engage in meditation or yoga'
    ],
    goal: 'Regular relaxation practice reduces overall anger reactivity',
    icon: 'spa',
    category: 'anger',
    practiceFrequency: 'Daily - 15 minutes',
    week: 7
  },
  {
    id: 32,
    title: 'Humor and Perspective',
    description: 'Use humor to defuse anger and gain perspective.',
    practiceSteps: [
      'Ask: Will this matter in 5 years?',
      'Find the absurdity in the situation',
      'Use self-deprecating humor appropriately',
      'Laugh at the situation, not the person'
    ],
    goal: 'Humor shifts perspective and reduces anger intensity',
    icon: 'sentiment-satisfied',
    category: 'anger',
    practiceFrequency: 'When appropriate',
    week: 8
  },
  {
    id: 33,
    title: 'Forgiveness Practice',
    description: 'Release anger by practicing forgiveness.',
    practiceSteps: [
      'Acknowledge the hurt you experienced',
      'Recognize that holding anger hurts you',
      'Choose to forgive for your own peace',
      'Let go of the need for revenge'
    ],
    goal: 'Forgiveness frees you from the burden of chronic anger',
    icon: 'healing',
    category: 'anger',
    practiceFrequency: 'Weekly reflection',
    week: 9
  },
  {
    id: 34,
    title: 'Problem-Solving Focus',
    description: 'Channel anger into constructive problem-solving.',
    practiceSteps: [
      'Define the problem clearly',
      'Brainstorm possible solutions',
      'Evaluate pros and cons of each',
      'Take action on the best solution'
    ],
    goal: 'Problem-solving transforms anger into productive action',
    icon: 'lightbulb',
    category: 'anger',
    practiceFrequency: 'When facing challenges',
    week: 10
  },
  {
    id: 35,
    title: 'Anger Prevention Lifestyle',
    description: 'Build habits that prevent anger buildup.',
    practiceSteps: [
      'Get adequate sleep (7-9 hours)',
      'Exercise regularly (30 minutes daily)',
      'Limit caffeine and alcohol',
      'Maintain healthy relationships'
    ],
    goal: 'A healthy lifestyle reduces overall anger susceptibility',
    icon: 'health-and-safety',
    category: 'anger',
    practiceFrequency: 'Daily habits',
    week: 11
  },
  {
    id: 36,
    title: 'Anger Mastery Integration',
    description: 'Integrate all anger management techniques into daily life.',
    practiceSteps: [
      'Review all 11 anger management techniques',
      'Identify your top 5 most effective tools',
      'Create an anger management action plan',
      'Commit to using these tools consistently'
    ],
    goal: 'You now have complete control over your anger responses',
    icon: 'emoji-events',
    category: 'anger',
    practiceFrequency: 'Daily practice',
    week: 12
  },
  // STRESS MANAGEMENT TECHNIQUES (12 weeks)
  {
    id: 37,
    title: 'Stress Awareness',
    description: 'Identify your personal stress triggers and responses.',
    practiceSteps: [
      'Keep a stress diary for one week',
      'Note situations that cause stress',
      'Record your physical and emotional responses',
      'Identify patterns and common triggers'
    ],
    goal: 'Awareness is the first step to managing stress effectively',
    icon: 'analytics',
    category: 'stress',
    practiceFrequency: 'Daily tracking',
    week: 1
  },
  {
    id: 38,
    title: 'Time Management',
    description: 'Reduce stress through better organization and planning.',
    practiceSteps: [
      'Create a daily priority list',
      'Break large tasks into smaller steps',
      'Schedule breaks throughout the day',
      'Learn to say no to non-essential tasks'
    ],
    goal: 'Effective time management eliminates overwhelm and stress',
    icon: 'schedule',
    category: 'stress',
    practiceFrequency: 'Daily planning',
    week: 2
  },
  {
    id: 39,
    title: 'Mindfulness Meditation',
    description: 'Practice present-moment awareness to reduce stress.',
    practiceSteps: [
      'Sit comfortably and close your eyes',
      'Focus on your breath',
      'When mind wanders, gently return to breath',
      'Practice for 10-15 minutes daily'
    ],
    goal: 'Mindfulness reduces stress by anchoring you in the present',
    icon: 'self-improvement',
    category: 'stress',
    practiceFrequency: 'Daily - 10-15 minutes',
    week: 3
  },
  {
    id: 40,
    title: 'Physical Exercise',
    description: 'Use movement to release stress hormones.',
    practiceSteps: [
      'Choose an activity you enjoy',
      'Exercise for at least 30 minutes',
      'Aim for moderate intensity',
      'Make it a regular habit'
    ],
    goal: 'Exercise is one of the most effective stress relievers',
    icon: 'fitness-center',
    category: 'stress',
    practiceFrequency: 'Daily - 30 minutes',
    week: 4
  },
  {
    id: 41,
    title: 'Social Support',
    description: 'Connect with others to reduce stress.',
    practiceSteps: [
      'Reach out to friends or family',
      'Share your feelings and concerns',
      'Ask for help when needed',
      'Offer support to others'
    ],
    goal: 'Social connection is a powerful stress buffer',
    icon: 'group',
    category: 'stress',
    practiceFrequency: 'Weekly connections',
    week: 5
  },
  {
    id: 42,
    title: 'Healthy Boundaries',
    description: 'Protect your energy by setting clear limits.',
    practiceSteps: [
      'Identify what drains your energy',
      'Communicate your limits clearly',
      'Practice saying no without guilt',
      'Prioritize self-care'
    ],
    goal: 'Boundaries prevent stress from overwhelming you',
    icon: 'block',
    category: 'stress',
    practiceFrequency: 'As needed',
    week: 6
  },
  {
    id: 43,
    title: 'Sleep Hygiene',
    description: 'Improve sleep quality to reduce stress.',
    practiceSteps: [
      'Maintain a consistent sleep schedule',
      'Create a relaxing bedtime routine',
      'Avoid screens 1 hour before bed',
      'Keep bedroom cool and dark'
    ],
    goal: 'Quality sleep is essential for stress resilience',
    icon: 'bedtime',
    category: 'stress',
    practiceFrequency: 'Daily routine',
    week: 7
  },
  {
    id: 44,
    title: 'Nutrition for Stress',
    description: 'Eat foods that support stress management.',
    practiceSteps: [
      'Eat regular, balanced meals',
      'Include omega-3 rich foods',
      'Limit caffeine and sugar',
      'Stay hydrated throughout the day'
    ],
    goal: 'Proper nutrition supports your body&apos;s stress response',
    icon: 'restaurant',
    category: 'stress',
    practiceFrequency: 'Daily habits',
    week: 8
  },
  {
    id: 45,
    title: 'Creative Expression',
    description: 'Use creativity as a stress outlet.',
    practiceSteps: [
      'Choose a creative activity (art, music, writing)',
      'Engage without judgment or pressure',
      'Focus on the process, not the outcome',
      'Make time for creativity regularly'
    ],
    goal: 'Creative expression provides a healthy stress release',
    icon: 'palette',
    category: 'stress',
    practiceFrequency: 'Weekly sessions',
    week: 9
  },
  {
    id: 46,
    title: 'Nature Connection',
    description: 'Reduce stress through time in nature.',
    practiceSteps: [
      'Spend time outdoors daily',
      'Take walks in natural settings',
      'Practice mindfulness in nature',
      'Notice the calming effects'
    ],
    goal: 'Nature exposure significantly reduces stress hormones',
    icon: 'nature',
    category: 'stress',
    practiceFrequency: 'Daily - 20 minutes',
    week: 10
  },
  {
    id: 47,
    title: 'Gratitude Practice',
    description: 'Shift focus from stressors to blessings.',
    practiceSteps: [
      'Write down 3 things you&apos;re grateful for',
      'Be specific and detailed',
      'Feel the appreciation deeply',
      'Review your gratitude list regularly'
    ],
    goal: 'Gratitude rewires your brain away from stress',
    icon: 'star',
    category: 'stress',
    practiceFrequency: 'Daily - Evening',
    week: 11
  },
  {
    id: 48,
    title: 'Stress Resilience Integration',
    description: 'Build a comprehensive stress management lifestyle.',
    practiceSteps: [
      'Review all 11 stress management techniques',
      'Choose your top 5 daily practices',
      'Create a stress management routine',
      'Commit to lifelong stress resilience'
    ],
    goal: 'You now have the tools to thrive under any stress',
    icon: 'emoji-events',
    category: 'stress',
    practiceFrequency: 'Daily practice',
    week: 12
  },
  // SOCIAL ANXIETY TECHNIQUES (12 weeks)
  {
    id: 49,
    title: 'Understanding Social Anxiety',
    description: 'Learn about social anxiety and its patterns.',
    practiceSteps: [
      'Identify situations that trigger anxiety',
      'Notice physical symptoms (sweating, trembling)',
      'Recognize negative thought patterns',
      'Understand that anxiety is common and treatable'
    ],
    goal: 'Understanding your anxiety is the first step to overcoming it',
    icon: 'psychology',
    category: 'social-anxiety',
    practiceFrequency: 'Daily reflection',
    week: 1
  },
  {
    id: 50,
    title: 'Breathing for Anxiety',
    description: 'Use breath control to calm social anxiety.',
    practiceSteps: [
      'Practice box breathing (4-4-4-4)',
      'Breathe deeply before social situations',
      'Use breath as an anchor during anxiety',
      'Practice daily to build the skill'
    ],
    goal: 'Controlled breathing calms your nervous system instantly',
    icon: 'air',
    category: 'social-anxiety',
    practiceFrequency: 'Before social events',
    week: 2
  },
  {
    id: 51,
    title: 'Challenging Anxious Thoughts',
    description: 'Question and reframe anxiety-producing thoughts.',
    practiceSteps: [
      'Identify the anxious thought',
      'Ask: What evidence supports this thought?',
      'Consider alternative, realistic thoughts',
      'Replace with balanced perspectives'
    ],
    goal: 'Thought challenging reduces anxiety intensity',
    icon: 'lightbulb',
    category: 'social-anxiety',
    practiceFrequency: 'When anxiety arises',
    week: 3
  },
  {
    id: 52,
    title: 'Gradual Exposure',
    description: 'Face feared situations gradually to build confidence.',
    practiceSteps: [
      'Create a hierarchy of feared situations',
      'Start with the least anxiety-provoking',
      'Practice repeatedly until anxiety decreases',
      'Gradually move to more challenging situations'
    ],
    goal: 'Gradual exposure is the most effective anxiety treatment',
    icon: 'trending-up',
    category: 'social-anxiety',
    practiceFrequency: 'Weekly challenges',
    week: 4
  },
  {
    id: 53,
    title: 'Social Skills Practice',
    description: 'Build confidence through skill development.',
    practiceSteps: [
      'Practice conversation starters',
      'Work on active listening skills',
      'Learn to ask open-ended questions',
      'Practice with safe people first'
    ],
    goal: 'Social skills reduce anxiety by increasing competence',
    icon: 'chat',
    category: 'social-anxiety',
    practiceFrequency: 'Daily practice',
    week: 5
  },
  {
    id: 54,
    title: 'Mindfulness in Social Situations',
    description: 'Stay present instead of worrying about judgment.',
    practiceSteps: [
      'Focus on the conversation, not your anxiety',
      'Notice your surroundings',
      'Listen actively to others',
      'Return to the present when mind wanders'
    ],
    goal: 'Mindfulness reduces self-consciousness and anxiety',
    icon: 'self-improvement',
    category: 'social-anxiety',
    practiceFrequency: 'During social events',
    week: 6
  },
  {
    id: 55,
    title: 'Self-Compassion',
    description: 'Treat yourself with kindness during anxiety.',
    practiceSteps: [
      'Acknowledge that anxiety is difficult',
      'Speak to yourself with compassion',
      'Recognize that everyone struggles',
      'Celebrate small victories'
    ],
    goal: 'Self-compassion reduces anxiety and builds resilience',
    icon: 'favorite',
    category: 'social-anxiety',
    practiceFrequency: 'Throughout the day',
    week: 7
  },
  {
    id: 56,
    title: 'Body Language Confidence',
    description: 'Use confident body language to reduce anxiety.',
    practiceSteps: [
      'Stand tall with shoulders back',
      'Make appropriate eye contact',
      'Smile genuinely',
      'Use open, relaxed gestures'
    ],
    goal: 'Confident body language reduces anxiety and improves interactions',
    icon: 'accessibility',
    category: 'social-anxiety',
    practiceFrequency: 'During social situations',
    week: 8
  },
  {
    id: 57,
    title: 'Preparation Strategies',
    description: 'Reduce anxiety through preparation.',
    practiceSteps: [
      'Research the social event beforehand',
      'Prepare conversation topics',
      'Visualize successful interactions',
      'Plan an exit strategy if needed'
    ],
    goal: 'Preparation reduces uncertainty and anxiety',
    icon: 'checklist',
    category: 'social-anxiety',
    practiceFrequency: 'Before events',
    week: 9
  },
  {
    id: 58,
    title: 'Focus Shifting',
    description: 'Shift focus from self to others.',
    practiceSteps: [
      'Ask others questions about themselves',
      'Show genuine interest in their responses',
      'Focus on helping others feel comfortable',
      'Notice how this reduces your anxiety'
    ],
    goal: 'Focusing on others reduces self-consciousness',
    icon: 'group',
    category: 'social-anxiety',
    practiceFrequency: 'During conversations',
    week: 10
  },
  {
    id: 59,
    title: 'Acceptance and Commitment',
    description: 'Accept anxiety while pursuing valued actions.',
    practiceSteps: [
      'Accept that some anxiety is normal',
      'Identify your social values',
      'Take action aligned with values despite anxiety',
      'Notice anxiety decreases with practice'
    ],
    goal: 'Acceptance allows you to act despite anxiety',
    icon: 'check-circle',
    category: 'social-anxiety',
    practiceFrequency: 'Daily commitment',
    week: 11
  },
  {
    id: 60,
    title: 'Social Confidence Integration',
    description: 'Integrate all techniques into a confident social life.',
    practiceSteps: [
      'Review all 11 social anxiety techniques',
      'Identify your most effective strategies',
      'Create a social confidence action plan',
      'Commit to regular social engagement'
    ],
    goal: 'You now have the tools to thrive in social situations',
    icon: 'emoji-events',
    category: 'social-anxiety',
    practiceFrequency: 'Daily practice',
    week: 12
  },
  // THOUGHTS REGULATION TECHNIQUES (12 weeks)
  {
    id: 61,
    title: 'Thought Awareness',
    description: 'Become aware of your automatic thoughts.',
    practiceSteps: [
      'Notice thoughts as they arise',
      'Write down recurring thoughts',
      'Identify patterns in your thinking',
      'Observe without judgment'
    ],
    goal: 'Awareness of thoughts is the foundation of regulation',
    icon: 'visibility',
    category: 'thoughts',
    practiceFrequency: 'Throughout the day',
    week: 1
  },
  {
    id: 62,
    title: 'Cognitive Distortions',
    description: 'Identify common thinking errors.',
    practiceSteps: [
      'Learn about cognitive distortions',
      'Identify which ones you use most',
      'Notice when they occur',
      'Label them when you catch them'
    ],
    goal: 'Recognizing distortions helps you correct them',
    icon: 'warning',
    category: 'thoughts',
    practiceFrequency: 'Daily practice',
    week: 2
  },
  {
    id: 63,
    title: 'Thought Challenging',
    description: 'Question the validity of negative thoughts.',
    practiceSteps: [
      'Identify a negative thought',
      'Ask: What evidence supports this?',
      'Ask: What evidence contradicts this?',
      'Form a balanced conclusion'
    ],
    goal: 'Challenging thoughts creates balanced thinking',
    icon: 'psychology',
    category: 'thoughts',
    practiceFrequency: 'When negative thoughts arise',
    week: 3
  },
  {
    id: 64,
    title: 'Thought Defusion',
    description: 'Create distance from your thoughts.',
    practiceSteps: [
      'Notice a thought and say "I&apos;m having the thought that..."',
      'Visualize thoughts as clouds passing by',
      'Recognize thoughts are not facts',
      'Let thoughts come and go without attachment'
    ],
    goal: 'Defusion reduces the power thoughts have over you',
    icon: 'cloud',
    category: 'thoughts',
    practiceFrequency: 'Throughout the day',
    week: 4
  },
  {
    id: 65,
    title: 'Positive Reframing',
    description: 'Find alternative, helpful perspectives.',
    practiceSteps: [
      'Identify a negative situation',
      'Ask: What could be positive about this?',
      'Consider what you can learn',
      'Find opportunities in challenges'
    ],
    goal: 'Reframing transforms obstacles into opportunities',
    icon: 'refresh',
    category: 'thoughts',
    practiceFrequency: 'When facing challenges',
    week: 5
  },
  {
    id: 66,
    title: 'Mindful Observation',
    description: 'Observe thoughts without engaging with them.',
    practiceSteps: [
      'Sit quietly and observe your thoughts',
      'Notice thoughts arise and pass',
      'Don&apos;t judge or engage with thoughts',
      'Return to breath when caught in thought'
    ],
    goal: 'Mindful observation creates space from thoughts',
    icon: 'self-improvement',
    category: 'thoughts',
    practiceFrequency: 'Daily - 10 minutes',
    week: 6
  },
  {
    id: 67,
    title: 'Thought Stopping',
    description: 'Interrupt rumination and negative thought spirals.',
    practiceSteps: [
      'Notice when you&apos;re ruminating',
      'Say "STOP" firmly (out loud or mentally)',
      'Shift attention to something else',
      'Engage in a different activity'
    ],
    goal: 'Thought stopping breaks negative thought cycles',
    icon: 'block',
    category: 'thoughts',
    practiceFrequency: 'When ruminating',
    week: 7
  },
  {
    id: 68,
    title: 'Gratitude Thinking',
    description: 'Train your mind to focus on positives.',
    practiceSteps: [
      'Each day, list 5 things you&apos;re grateful for',
      'Be specific and detailed',
      'Notice positive aspects of situations',
      'Share gratitude with others'
    ],
    goal: 'Gratitude rewires your brain for positive thinking',
    icon: 'star',
    category: 'thoughts',
    practiceFrequency: 'Daily - Morning & Evening',
    week: 8
  },
  {
    id: 69,
    title: 'Future-Focused Thinking',
    description: 'Direct thoughts toward goals and possibilities.',
    practiceSteps: [
      'Set clear, specific goals',
      'Visualize achieving your goals',
      'Think about steps to reach goals',
      'Focus on what you can control'
    ],
    goal: 'Future-focused thinking creates motivation and direction',
    icon: 'flag',
    category: 'thoughts',
    practiceFrequency: 'Daily planning',
    week: 9
  },
  {
    id: 70,
    title: 'Compassionate Thinking',
    description: 'Replace self-criticism with self-compassion.',
    practiceSteps: [
      'Notice self-critical thoughts',
      'Ask: Would I say this to a friend?',
      'Reframe with kindness and understanding',
      'Treat yourself as you would a loved one'
    ],
    goal: 'Compassionate thinking builds self-esteem and resilience',
    icon: 'favorite-border',
    category: 'thoughts',
    practiceFrequency: 'Throughout the day',
    week: 10
  },
  {
    id: 71,
    title: 'Metacognition',
    description: 'Think about your thinking patterns.',
    practiceSteps: [
      'Reflect on your thought patterns',
      'Identify helpful vs unhelpful thinking',
      'Notice when you&apos;re in a negative pattern',
      'Consciously choose better thought patterns'
    ],
    goal: 'Metacognition gives you control over your thinking',
    icon: 'psychology',
    category: 'thoughts',
    practiceFrequency: 'Weekly reflection',
    week: 11
  },
  {
    id: 72,
    title: 'Thought Mastery Integration',
    description: 'Master your thoughts to master your life.',
    practiceSteps: [
      'Review all 11 thought regulation techniques',
      'Choose your top 5 daily practices',
      'Create a thought management routine',
      'Commit to conscious, intentional thinking'
    ],
    goal: 'You now control your thoughts instead of being controlled by them',
    icon: 'emoji-events',
    category: 'thoughts',
    practiceFrequency: 'Daily practice',
    week: 12
  },
  // ORGANIZATION SKILLS (Phase 7, Days 73-81)
  {
    id: 73,
    title: 'Personal Organization Baseline',
    description: 'Identify your top friction points in daily organization without judgment.',
    practiceSteps: [
      'Walk through your day mentally from waking to sleeping',
      'Write down three moments where you felt stuck or lost track',
      'For each friction point, note what made it hard to start or finish',
      'No solutions yet — just honest observation'
    ],
    goal: 'Awareness of your friction points is the foundation of any useful system',
    icon: 'search',
    category: 'organization' as const,
    practiceFrequency: 'Once — observation exercise',
    week: 13
  },
  {
    id: 74,
    title: 'Values-Based Priorities',
    description: 'Distinguish between urgent-feeling tasks and genuinely important ones.',
    practiceSteps: [
      'Write down everything you feel you need to do',
      'For each item, ask: does this move me toward what I genuinely care about?',
      'Sort into High alignment, Low alignment, and Unclear',
      'Choose one High alignment task to protect time for today'
    ],
    goal: 'Spending energy on high-alignment tasks reduces overwhelm and increases meaning',
    icon: 'flag',
    category: 'organization' as const,
    practiceFrequency: 'Daily — morning planning',
    week: 13
  },
  {
    id: 75,
    title: 'Breaking Tasks into Next Actions',
    description: 'Convert stuck or avoided tasks into clear, concrete next steps.',
    practiceSteps: [
      'Pick one task you have been avoiding',
      'Ask: what is the very next physical action I would need to take?',
      'Write it as a specific verb + object',
      'Set a timer for 2 minutes and do only that one action'
    ],
    goal: 'A clear next action removes the paralysis that vague tasks create',
    icon: 'check-circle',
    category: 'organization' as const,
    practiceFrequency: 'As needed — when stuck',
    week: 13
  },
  {
    id: 76,
    title: 'Time Estimation and Realistic Planning',
    description: 'Practice estimating task duration and compare it to actual time taken.',
    practiceSteps: [
      'Choose 3 tasks you plan to do today',
      'Before starting each, write your time estimate',
      'Time yourself doing each task',
      'Compare estimate vs. actual and note patterns'
    ],
    goal: 'Accurate time estimates make planning realistic and reduce end-of-day frustration',
    icon: 'schedule',
    category: 'organization' as const,
    practiceFrequency: 'Daily — planning sessions',
    week: 14
  },
  {
    id: 77,
    title: 'Focused Work and Distraction Design',
    description: 'Complete one focused work session and identify your top distraction.',
    practiceSteps: [
      'Choose one task that requires concentration',
      'Remove your top distraction before starting',
      'Work for 20 minutes without switching tasks',
      'Note what distracted you and what helped you stay focused'
    ],
    goal: 'Focus is an environment you design, not a personality trait',
    icon: 'center-focus-strong',
    category: 'organization' as const,
    practiceFrequency: 'Daily — focused work blocks',
    week: 14
  },
  {
    id: 78,
    title: 'Creating Simple Routines and Cues',
    description: 'Design one simple routine with a clear cue to reduce decision fatigue.',
    practiceSteps: [
      'Choose one recurring task you want to do more consistently',
      'Choose a cue: a time, location, or existing habit',
      'Write: When [cue], I will [action], for [duration]',
      'Try it once today and note whether the cue worked'
    ],
    goal: 'Simple routines with clear cues become automatic and reduce mental load',
    icon: 'repeat',
    category: 'organization' as const,
    practiceFrequency: 'Daily — routine practice',
    week: 14
  },
  {
    id: 79,
    title: 'Organizing Spaces Accessibly',
    description: 'Improve one physical or digital space so frequently needed items are easier to find.',
    practiceSteps: [
      'Choose one small area: a drawer, folder, inbox, or surface',
      'Remove or archive anything unused in the past month',
      'Place the three most-used items in the most accessible position',
      'Label things clearly so future-you can find them without remembering a system'
    ],
    goal: 'An organized space is one where you can find what you need — not one that looks a certain way',
    icon: 'folder-open',
    category: 'organization' as const,
    practiceFrequency: 'Weekly — space maintenance',
    week: 15
  },
  {
    id: 80,
    title: 'Flexible Weekly Review',
    description: 'Complete a brief weekly review and update your priorities.',
    practiceSteps: [
      'Set a timer for 10 minutes',
      'Ask: what did I do this week that I feel good about?',
      'Ask: what is still unfinished and still matters?',
      'Ask: what do I want to protect time for next week?'
    ],
    goal: 'A 10-minute review that helps you feel oriented is more valuable than a perfect system you never use',
    icon: 'event-note',
    category: 'organization' as const,
    practiceFrequency: 'Weekly — review session',
    week: 15
  },
  {
    id: 81,
    title: 'Organization Integration',
    description: 'Define your personal organization system and your recovery plan after disruption.',
    practiceSteps: [
      'Review the past nine days and write one friction point you reduced',
      'Write one tool or habit that actually helped you',
      'Write one thing you tried that did not fit — and let it go',
      'Write your one-sentence system and your recovery plan'
    ],
    goal: 'A good system is not one that never breaks — it is one you can return to after it breaks',
    icon: 'integration-instructions',
    category: 'organization' as const,
    practiceFrequency: 'Once — integration exercise',
    week: 15
  },
  // COMMUNICATION SKILLS (Phase 8, Days 82-90)
  {
    id: 82,
    title: 'Communication Baseline and Listening',
    description: 'Observe your communication patterns and practice listening to understand.',
    practiceSteps: [
      'In your next conversation, practice listening to understand rather than to respond',
      'Notice: are you thinking about what to say while the other person is still speaking?',
      'After the conversation, write what the other person actually said',
      'Note what you noticed about your own listening'
    ],
    goal: 'Most communication problems happen in the receiving half — listening to understand changes everything',
    icon: 'hearing',
    category: 'communication' as const,
    practiceFrequency: 'Daily — in conversations',
    week: 16
  },
  {
    id: 83,
    title: 'Emotion Labeling Before Speaking',
    description: 'Practice labeling your emotion before responding in emotionally charged interactions.',
    practiceSteps: [
      'Before responding in a charged interaction, pause and silently name what you are feeling',
      'Notice: does naming it change the intensity even slightly?',
      'Write down the emotion you labeled and what you said or did next',
      'Practice with low-stakes moments if no charged interaction occurs today'
    ],
    goal: 'Labeling emotion before speaking creates a pause that changes what you say and how you say it',
    icon: 'label',
    category: 'communication' as const,
    practiceFrequency: 'Daily — before responding',
    week: 16
  },
  {
    id: 84,
    title: 'Clear "I" Statements and Specific Requests',
    description: 'Practice forming "I" statements and specific requests to communicate needs clearly.',
    practiceSteps: [
      'Think of a situation where you want to communicate a need or concern',
      'Write an "I" statement: "I feel [emotion] when [situation] because [impact]"',
      'Write a specific request: "What I am asking for is [concrete action]"',
      'Read both aloud and notice: does it feel honest and fair?'
    ],
    goal: '"I" statements reduce defensiveness and increase the chance of being understood',
    icon: 'record-voice-over',
    category: 'communication' as const,
    practiceFrequency: 'As needed — when communicating needs',
    week: 16
  },
  {
    id: 85,
    title: 'Assertive Communication',
    description: 'Practice assertive communication — clear, specific, and respectful.',
    practiceSteps: [
      'Think of a recent situation where you were passive or aggressive',
      'Write what you actually said or did not say',
      'Write an assertive version: clear, specific, and respectful',
      'Notice what would have made the assertive version hard to say'
    ],
    goal: 'Assertive communication is a skill, not a personality type — it can be learned',
    icon: 'campaign',
    category: 'communication' as const,
    practiceFrequency: 'Daily — in interactions',
    week: 17
  },
  {
    id: 86,
    title: 'Boundaries and Respectful Refusal',
    description: 'Practice one clear, respectful refusal — real or rehearsed.',
    practiceSteps: [
      'Think of a request you want to decline',
      'Write a refusal: "I am not able to [request]. [Optional one-sentence reason]"',
      'Practice saying it aloud — to yourself or a trusted person',
      'Notice what makes it hard to say no in this situation'
    ],
    goal: 'A clear, respectful no is a complete sentence — you do not owe anyone a detailed justification',
    icon: 'do-not-disturb',
    category: 'communication' as const,
    practiceFrequency: 'As needed — when declining requests',
    week: 17
  },
  {
    id: 87,
    title: 'Clarifying Assumptions and Repairing Misunderstandings',
    description: 'Practice clarifying questions and repair statements to reduce unnecessary conflict.',
    practiceSteps: [
      'Think of a recent misunderstanding or assumption you made',
      'Write a clarifying question: "When you said [X], did you mean [Y]?"',
      'Write a repair statement: "I think I misunderstood — what I heard was [X], is that right?"',
      'Notice how forming the question changes your perspective on the situation'
    ],
    goal: 'Checking assumptions before reacting reduces most unnecessary conflict',
    icon: 'help-outline',
    category: 'communication' as const,
    practiceFrequency: 'As needed — when confused or in conflict',
    week: 17
  },
  {
    id: 88,
    title: 'Difficult Conversations',
    description: 'Prepare for one difficult conversation — or identify a safer alternative.',
    practiceSteps: [
      'Identify one difficult conversation you have been avoiding',
      'Write: what is my goal? What is the minimum outcome I need? What will I do if it becomes unsafe?',
      'Write an opening sentence that is honest and non-accusatory',
      'Consider alternatives: written communication, delay, or support from a trusted person'
    ],
    goal: 'Preparing for a difficult conversation means knowing your goal, your bottom line, and your exit',
    icon: 'forum',
    category: 'communication' as const,
    practiceFrequency: 'As needed — before difficult conversations',
    week: 18
  },
  {
    id: 89,
    title: 'Feedback, Empathy, and Perspective-Taking',
    description: 'Practice giving or receiving feedback with empathy and without forced agreement.',
    practiceSteps: [
      'Think of a situation where you want to give feedback or recently received it',
      'For giving: write "I noticed [observation]. The impact was [effect]. I am sharing this because [reason]"',
      'For receiving: write the feedback, then ask "What might be true about this, even if I disagree?"',
      'Notice: can you understand the other perspective without having to agree with it?'
    ],
    goal: 'Empathy does not mean agreeing — you can understand a perspective without endorsing it',
    icon: 'people',
    category: 'communication' as const,
    practiceFrequency: 'As needed — in feedback situations',
    week: 18
  },
  {
    id: 90,
    title: '90-Day Integration and Communication Plan',
    description: 'Define your communication strengths, growth areas, and maintenance plan.',
    practiceSteps: [
      'Write one communication skill you have genuinely improved and how you know',
      'Write one area you want to keep working on',
      'Write your maintenance plan: what to return to when communication gets hard',
      'Write the most important thing you learned about yourself in these 90 days'
    ],
    goal: 'The skills you have built require ongoing practice — a maintenance plan is how you keep them',
    icon: 'emoji-events',
    category: 'communication' as const,
    practiceFrequency: 'Once — completion reflection',
    week: 18
  }
];
