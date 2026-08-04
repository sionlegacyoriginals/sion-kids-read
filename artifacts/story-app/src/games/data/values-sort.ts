// Values Sort — 20 levels
// Each level has 2 value buckets and 4 actions to sort into them.
// actions[n].bucket matches buckets[index].

export type VSAction = { text: string; bucket: string };
export type VSBucket = { name: string; emoji: string; description: string };

export type VSLevel = {
  level: number;
  buckets: [VSBucket, VSBucket];
  actions: VSAction[];   // 4 actions total, 2 per bucket
};

export const VALUES_SORT_LEVELS: VSLevel[] = [
  {
    level: 1,
    buckets: [{ name: "Kindness", emoji: "💛", description: "Being gentle and caring" }, { name: "Honesty", emoji: "✅", description: "Telling the truth" }],
    actions: [
      { text: "Sharing your snack with a friend", bucket: "Kindness" },
      { text: "Telling the teacher you broke the vase", bucket: "Honesty" },
      { text: "Comforting someone who is sad", bucket: "Kindness" },
      { text: "Saying you didn't finish your homework", bucket: "Honesty" },
    ],
  },
  {
    level: 2,
    buckets: [{ name: "Courage", emoji: "🦁", description: "Being brave" }, { name: "Patience", emoji: "⏳", description: "Waiting calmly" }],
    actions: [
      { text: "Standing up for a friend being bullied", bucket: "Courage" },
      { text: "Waiting in line without pushing", bucket: "Patience" },
      { text: "Trying something scary for the first time", bucket: "Courage" },
      { text: "Waiting your turn to speak", bucket: "Patience" },
    ],
  },
  {
    level: 3,
    buckets: [{ name: "Gratitude", emoji: "🙏", description: "Saying thank you" }, { name: "Responsibility", emoji: "🔑", description: "Doing what you should" }],
    actions: [
      { text: "Thanking your teacher for helping you", bucket: "Gratitude" },
      { text: "Feeding your pet every morning", bucket: "Responsibility" },
      { text: "Writing a thank-you card", bucket: "Gratitude" },
      { text: "Finishing your chores without being reminded", bucket: "Responsibility" },
    ],
  },
  {
    level: 4,
    buckets: [{ name: "Generosity", emoji: "🎁", description: "Giving freely" }, { name: "Respect", emoji: "🤝", description: "Treating others well" }],
    actions: [
      { text: "Donating toys you no longer use", bucket: "Generosity" },
      { text: "Listening when your grandparent speaks", bucket: "Respect" },
      { text: "Giving extra food to someone who is hungry", bucket: "Generosity" },
      { text: "Not interrupting when others are talking", bucket: "Respect" },
    ],
  },
  {
    level: 5,
    buckets: [{ name: "Empathy", emoji: "❤️", description: "Understanding others' feelings" }, { name: "Self-Control", emoji: "🧘", description: "Managing your reactions" }],
    actions: [
      { text: "Noticing a friend looks upset and asking if they're okay", bucket: "Empathy" },
      { text: "Taking a deep breath when you feel angry", bucket: "Self-Control" },
      { text: "Imagining how someone else feels in a hard situation", bucket: "Empathy" },
      { text: "Walking away instead of arguing", bucket: "Self-Control" },
    ],
  },
  {
    level: 6,
    buckets: [{ name: "Teamwork", emoji: "🤜", description: "Working together" }, { name: "Creativity", emoji: "🎨", description: "Using imagination" }],
    actions: [
      { text: "Dividing tasks fairly in a group project", bucket: "Teamwork" },
      { text: "Making up a new game to play", bucket: "Creativity" },
      { text: "Helping a teammate who is struggling", bucket: "Teamwork" },
      { text: "Drawing a picture to explain an idea", bucket: "Creativity" },
    ],
  },
  {
    level: 7,
    buckets: [{ name: "Humility", emoji: "🌱", description: "Being modest" }, { name: "Loyalty", emoji: "🐾", description: "Being faithful to others" }],
    actions: [
      { text: "Letting someone else take the credit they deserve", bucket: "Humility" },
      { text: "Defending a friend when others speak badly of them", bucket: "Loyalty" },
      { text: "Admitting when you are wrong", bucket: "Humility" },
      { text: "Keeping a promise even when it's inconvenient", bucket: "Loyalty" },
    ],
  },
  {
    level: 8,
    buckets: [{ name: "Diligence", emoji: "📝", description: "Working hard and carefully" }, { name: "Compassion", emoji: "🫂", description: "Caring about suffering" }],
    actions: [
      { text: "Checking your work before handing it in", bucket: "Diligence" },
      { text: "Helping someone who is in pain", bucket: "Compassion" },
      { text: "Practising every day to improve", bucket: "Diligence" },
      { text: "Raising money to help people in need", bucket: "Compassion" },
    ],
  },
  {
    level: 9,
    buckets: [{ name: "Curiosity", emoji: "🔍", description: "Wanting to learn more" }, { name: "Joy", emoji: "😄", description: "Finding happiness" }],
    actions: [
      { text: "Asking lots of questions about how things work", bucket: "Curiosity" },
      { text: "Laughing and dancing when you're happy", bucket: "Joy" },
      { text: "Reading extra books to learn about animals", bucket: "Curiosity" },
      { text: "Celebrating a friend's success with them", bucket: "Joy" },
    ],
  },
  {
    level: 10,
    buckets: [{ name: "Perseverance", emoji: "💪", description: "Not giving up" }, { name: "Hope", emoji: "🌈", description: "Believing good things are coming" }],
    actions: [
      { text: "Trying a maths problem five times until you get it", bucket: "Perseverance" },
      { text: "Believing things will get better during a hard time", bucket: "Hope" },
      { text: "Practising a skill even after failing many times", bucket: "Perseverance" },
      { text: "Encouraging a friend that tomorrow will be a better day", bucket: "Hope" },
    ],
  },
  {
    level: 11,
    buckets: [{ name: "Trustworthiness", emoji: "🔐", description: "Being reliable and honest" }, { name: "Sharing", emoji: "🍕", description: "Giving to others" }],
    actions: [
      { text: "Returning found money to its owner", bucket: "Trustworthiness" },
      { text: "Splitting your dessert with a sibling", bucket: "Sharing" },
      { text: "Keeping a secret your friend asked you to keep", bucket: "Trustworthiness" },
      { text: "Letting others borrow your art supplies", bucket: "Sharing" },
    ],
  },
  {
    level: 12,
    buckets: [{ name: "Love", emoji: "💖", description: "Deeply caring for others" }, { name: "Bravery", emoji: "🛡️", description: "Acting despite fear" }],
    actions: [
      { text: "Giving your grandparent a hug when they're lonely", bucket: "Love" },
      { text: "Telling a teacher about something dangerous", bucket: "Bravery" },
      { text: "Writing a kind letter to a family member", bucket: "Love" },
      { text: "Admitting a mistake in front of the class", bucket: "Bravery" },
    ],
  },
  {
    level: 13,
    buckets: [{ name: "Forgiveness", emoji: "🕊️", description: "Letting go of anger" }, { name: "Integrity", emoji: "⚖️", description: "Doing what is right" }],
    actions: [
      { text: "Choosing not to stay angry at a friend who apologised", bucket: "Forgiveness" },
      { text: "Not cheating even when no one is watching", bucket: "Integrity" },
      { text: "Moving on after someone hurt your feelings", bucket: "Forgiveness" },
      { text: "Returning extra change given by mistake at a shop", bucket: "Integrity" },
    ],
  },
  {
    level: 14,
    buckets: [{ name: "Wisdom", emoji: "🦉", description: "Making good decisions" }, { name: "Service", emoji: "🌻", description: "Helping without reward" }],
    actions: [
      { text: "Thinking before reacting to something upsetting", bucket: "Wisdom" },
      { text: "Volunteering to clean up after a community event", bucket: "Service" },
      { text: "Asking for advice before making a big decision", bucket: "Wisdom" },
      { text: "Helping a neighbour carry their shopping", bucket: "Service" },
    ],
  },
  {
    level: 15,
    buckets: [{ name: "Inclusion", emoji: "🌍", description: "Making everyone feel welcome" }, { name: "Excellence", emoji: "🏅", description: "Doing your best" }],
    actions: [
      { text: "Inviting the new student to join your lunch table", bucket: "Inclusion" },
      { text: "Putting your full effort into every task", bucket: "Excellence" },
      { text: "Making sure nobody is left out of the game", bucket: "Inclusion" },
      { text: "Going over your work to make it even better", bucket: "Excellence" },
    ],
  },
  {
    level: 16,
    buckets: [{ name: "Contentment", emoji: "☮️", description: "Being happy with what you have" }, { name: "Determination", emoji: "🎯", description: "Keeping your goal in mind" }],
    actions: [
      { text: "Enjoying what you have instead of wanting more", bucket: "Contentment" },
      { text: "Training every day to win the spelling competition", bucket: "Determination" },
      { text: "Finding joy in simple everyday moments", bucket: "Contentment" },
      { text: "Keeping going with your art project even when it's difficult", bucket: "Determination" },
    ],
  },
  {
    level: 17,
    buckets: [{ name: "Stewardship", emoji: "♻️", description: "Caring for what you've been given" }, { name: "Justice", emoji: "⚖️", description: "Fairness for everyone" }],
    actions: [
      { text: "Recycling and reducing waste at home", bucket: "Stewardship" },
      { text: "Speaking up when someone is treated unfairly", bucket: "Justice" },
      { text: "Taking good care of borrowed items", bucket: "Stewardship" },
      { text: "Making sure group rewards are shared equally", bucket: "Justice" },
    ],
  },
  {
    level: 18,
    buckets: [{ name: "Hospitality", emoji: "🏠", description: "Welcoming and caring for guests" }, { name: "Mindfulness", emoji: "🧠", description: "Being present and aware" }],
    actions: [
      { text: "Making a visitor feel comfortable in your home", bucket: "Hospitality" },
      { text: "Paying attention to how your words affect others", bucket: "Mindfulness" },
      { text: "Offering a drink to someone who has just arrived", bucket: "Hospitality" },
      { text: "Noticing when your own mood affects your actions", bucket: "Mindfulness" },
    ],
  },
  {
    level: 19,
    buckets: [{ name: "Advocacy", emoji: "📢", description: "Speaking up for others" }, { name: "Resilience", emoji: "🌊", description: "Bouncing back from hard times" }],
    actions: [
      { text: "Telling an adult when a classmate is being mistreated", bucket: "Advocacy" },
      { text: "Getting back up after a big disappointment", bucket: "Resilience" },
      { text: "Writing a letter to help people who can't speak for themselves", bucket: "Advocacy" },
      { text: "Adjusting your plans when things don't go as expected", bucket: "Resilience" },
    ],
  },
  {
    level: 20,
    buckets: [{ name: "Servant Leadership", emoji: "👑", description: "Leading by serving others" }, { name: "Legacy", emoji: "🌳", description: "Leaving the world better than you found it" }],
    actions: [
      { text: "Leading a team by listening and encouraging rather than commanding", bucket: "Servant Leadership" },
      { text: "Planting trees so future generations enjoy shade", bucket: "Legacy" },
      { text: "Using your talents to lift others instead of just yourself", bucket: "Servant Leadership" },
      { text: "Teaching a younger child a skill you worked hard to learn", bucket: "Legacy" },
    ],
  },
];
