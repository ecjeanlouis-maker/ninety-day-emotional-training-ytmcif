
export interface WelcomeContent {
  emotional: {
    welcomeMessage: string;
    motivationalQuote: string;
    quoteAuthor: string;
    testimonies: Testimony[];
  };
  confidence: {
    welcomeMessage: string;
    motivationalQuote: string;
    quoteAuthor: string;
    testimonies: Testimony[];
  };
  anger: {
    welcomeMessage: string;
    motivationalQuote: string;
    quoteAuthor: string;
    testimonies: Testimony[];
  };
  stress: {
    welcomeMessage: string;
    motivationalQuote: string;
    quoteAuthor: string;
    testimonies: Testimony[];
  };
  'social-anxiety': {
    welcomeMessage: string;
    motivationalQuote: string;
    quoteAuthor: string;
    testimonies: Testimony[];
  };
  thoughts: {
    welcomeMessage: string;
    motivationalQuote: string;
    quoteAuthor: string;
    testimonies: Testimony[];
  };
}

export interface Testimony {
  id: number;
  name: string;
  text: string;
  rating: number;
}

export const welcomeContent: WelcomeContent = {
  emotional: {
    welcomeMessage: 'Welcome to your Emotional Control journey! Over the next 12 weeks, you will master powerful techniques to regulate your emotions, respond with clarity, and build inner peace. This program will transform how you experience and manage your emotional world.',
    motivationalQuote: 'Between stimulus and response there is a space. In that space is our power to choose our response. In our response lies our growth and our freedom.',
    quoteAuthor: 'Viktor Frankl',
    testimonies: [
      {
        id: 1,
        name: 'Sarah M.',
        text: 'This program changed my life. I used to react impulsively to everything. Now I have the tools to pause, breathe, and respond with intention. My relationships have improved dramatically.',
        rating: 5
      },
      {
        id: 2,
        name: 'Michael T.',
        text: 'The breathing exercises and emotion labeling techniques are game-changers. I feel more in control of my emotions than ever before. Highly recommend this program!',
        rating: 5
      },
      {
        id: 3,
        name: 'Jennifer L.',
        text: 'After 12 weeks, I can honestly say I am a different person. The techniques are simple but incredibly effective. I no longer let my emotions control me.',
        rating: 5
      }
    ]
  },
  confidence: {
    welcomeMessage: 'Welcome to your Confidence Development journey! Over the next 12 weeks, you will build unshakeable self-belief, expand your comfort zone, and develop the inner strength to achieve your goals. This program will transform how you see yourself and your potential.',
    motivationalQuote: 'Confidence is not about being perfect. It is about believing in your ability to learn, grow, and handle whatever comes your way.',
    quoteAuthor: 'Carol Dweck',
    testimonies: [
      {
        id: 1,
        name: 'David R.',
        text: 'I was always the shy person in the room. After completing this program, I now speak up confidently in meetings and social situations. The transformation is incredible!',
        rating: 5
      },
      {
        id: 2,
        name: 'Emily K.',
        text: 'The daily affirmations and visualization exercises completely changed my mindset. I went from doubting myself constantly to believing I can achieve anything I set my mind to.',
        rating: 5
      },
      {
        id: 3,
        name: 'James P.',
        text: 'This program gave me the tools to step outside my comfort zone. I have accomplished more in 12 weeks than I did in the past 5 years. Truly life-changing!',
        rating: 5
      }
    ]
  },
  anger: {
    welcomeMessage: 'Welcome to your Anger Management journey! Over the next 12 weeks, you will learn to recognize, understand, and control your anger responses. This program will teach you healthy ways to express anger and transform it into constructive action.',
    motivationalQuote: 'For every minute you remain angry, you give up sixty seconds of peace of mind.',
    quoteAuthor: 'Ralph Waldo Emerson',
    testimonies: [
      {
        id: 1,
        name: 'Robert K.',
        text: 'I used to explode at the smallest things. This program taught me to recognize my triggers and respond calmly. My family relationships have completely transformed.',
        rating: 5
      },
      {
        id: 2,
        name: 'Lisa H.',
        text: 'The timeout technique and thought challenging exercises saved my career. I no longer let anger control my professional interactions. Absolutely life-changing!',
        rating: 5
      },
      {
        id: 3,
        name: 'Marcus D.',
        text: 'Learning to channel anger into physical exercise and problem-solving has been revolutionary. I feel more in control than ever before.',
        rating: 5
      }
    ]
  },
  stress: {
    welcomeMessage: 'Welcome to your Stress Management journey! Over the next 12 weeks, you will develop powerful strategies to manage stress, build resilience, and create a balanced lifestyle. This program will transform how you handle life&apos;s pressures.',
    motivationalQuote: 'It&apos;s not stress that kills us, it is our reaction to it.',
    quoteAuthor: 'Hans Selye',
    testimonies: [
      {
        id: 1,
        name: 'Amanda S.',
        text: 'I was constantly overwhelmed and exhausted. This program taught me time management and boundary-setting that changed everything. I finally feel in control of my life.',
        rating: 5
      },
      {
        id: 2,
        name: 'Chris W.',
        text: 'The mindfulness and exercise techniques reduced my stress levels dramatically. I sleep better, feel calmer, and handle challenges with ease now.',
        rating: 5
      },
      {
        id: 3,
        name: 'Nicole P.',
        text: 'Learning to manage stress through healthy habits has improved every area of my life. I&apos;m more productive, happier, and healthier than ever.',
        rating: 5
      }
    ]
  },
  'social-anxiety': {
    welcomeMessage: 'Welcome to your Social Anxiety journey! Over the next 12 weeks, you will learn to overcome social fears, build confidence in social situations, and develop the skills to connect authentically with others. This program will transform your social life.',
    motivationalQuote: 'You wouldn&apos;t worry so much about what others think of you if you realized how seldom they do.',
    quoteAuthor: 'Eleanor Roosevelt',
    testimonies: [
      {
        id: 1,
        name: 'Alex T.',
        text: 'I used to avoid all social situations. This program helped me face my fears gradually and build real confidence. I now enjoy socializing and have made amazing friends.',
        rating: 5
      },
      {
        id: 2,
        name: 'Rachel M.',
        text: 'The gradual exposure and thought challenging techniques were game-changers. I went from panic attacks before events to actually looking forward to social gatherings.',
        rating: 5
      },
      {
        id: 3,
        name: 'Jordan L.',
        text: 'Learning to focus on others instead of my anxiety completely transformed my social interactions. I feel free and confident in any social situation now.',
        rating: 5
      }
    ]
  },
  thoughts: {
    welcomeMessage: 'Welcome to your Thoughts Regulation journey! Over the next 12 weeks, you will learn to observe, challenge, and direct your thoughts intentionally. This program will teach you to master your mind and create the mental patterns that serve your goals.',
    motivationalQuote: 'The mind is everything. What you think you become.',
    quoteAuthor: 'Buddha',
    testimonies: [
      {
        id: 1,
        name: 'Steven R.',
        text: 'I was trapped in negative thinking patterns for years. This program taught me to recognize and change my thoughts. My entire outlook on life has transformed.',
        rating: 5
      },
      {
        id: 2,
        name: 'Michelle K.',
        text: 'Learning thought defusion and reframing techniques freed me from rumination and worry. I now control my thoughts instead of being controlled by them.',
        rating: 5
      },
      {
        id: 3,
        name: 'Daniel P.',
        text: 'The metacognition exercises helped me understand my thinking patterns and consciously choose better ones. This is the most powerful skill I&apos;ve ever learned.',
        rating: 5
      }
    ]
  }
};
