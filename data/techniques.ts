
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
  }
];
