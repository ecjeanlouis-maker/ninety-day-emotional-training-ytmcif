
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
  }
};
