// Kindness Quest — 20 levels, 1 scenario per level
// choices[0] is always the correct (kindest) answer

export type KQLevel = {
  level: number;
  scenario: string;
  emoji: string;
  choices: [string, string, string, string];
  explanation: string; // shown after answering
};

export const KINDNESS_QUEST_LEVELS: KQLevel[] = [
  {
    level: 1, emoji: "😢",
    scenario: "Your friend trips and falls on the playground. What do you do?",
    choices: ["Help them up and ask if they're okay", "Laugh and walk away", "Keep playing and ignore them", "Tell everyone what happened"],
    explanation: "Helping someone who is hurt is a simple act of kindness.",
  },
  {
    level: 2, emoji: "🍱",
    scenario: "A classmate forgot their lunch. You have extra food. What do you do?",
    choices: ["Share your extra food with them", "Eat it all yourself", "Hide your extra food", "Tell the teacher they're hungry and walk away"],
    explanation: "Sharing what you have with someone in need shows generosity.",
  },
  {
    level: 3, emoji: "🎨",
    scenario: "A new student doesn't know where the art supplies are. What do you do?",
    choices: ["Show them where everything is and invite them to sit with you", "Point and say 'over there'", "Ignore them — they'll figure it out", "Tell them to ask the teacher"],
    explanation: "Including new people helps them feel welcome and safe.",
  },
  {
    level: 4, emoji: "😤",
    scenario: "You feel angry because someone took your seat. What is the kindest thing to do?",
    choices: ["Calmly say 'I think that's my seat — can we work it out?'", "Yell at them to move", "Push them off the seat", "Sulk and refuse to sit anywhere"],
    explanation: "Staying calm and talking things out is much kinder than getting angry.",
  },
  {
    level: 5, emoji: "🌧️",
    scenario: "Your friend is sad because their pet is sick. What do you do?",
    choices: ["Sit with them and listen to how they feel", "Tell them to cheer up", "Talk about your own pet", "Ask them to play a game to distract them"],
    explanation: "Listening is one of the most powerful ways to show someone you care.",
  },
  {
    level: 6, emoji: "🗑️",
    scenario: "You see litter on the school path. No one is watching. What do you do?",
    choices: ["Pick it up and put it in the bin", "Leave it — you didn't drop it", "Kick it aside so no one trips", "Wait for a teacher to handle it"],
    explanation: "Caring for shared spaces is a way to be kind to your whole community.",
  },
  {
    level: 7, emoji: "📖",
    scenario: "A classmate is struggling to read aloud. Others start to giggle. What do you do?",
    choices: ["Give an encouraging smile and wait patiently", "Join in the giggling", "Cover your mouth so they don't see you laugh", "Ask the teacher to stop calling on them"],
    explanation: "Encouragement instead of mockery helps people feel brave.",
  },
  {
    level: 8, emoji: "🎮",
    scenario: "You and your sibling both want the last turn at a game. What do you do?",
    choices: ["Offer to let them go first since you went first last time", "Grab the controller before they can", "Argue until a parent decides", "Walk away and refuse to play at all"],
    explanation: "Taking turns and putting others first is a form of love.",
  },
  {
    level: 9, emoji: "🏆",
    scenario: "You win a prize and your friend who tried really hard didn't. What do you do?",
    choices: ["Congratulate yourself quietly and say 'you did great too'", "Brag loudly about winning", "Pretend you didn't win so they feel better", "Ignore your friend's feelings"],
    explanation: "You can celebrate your success while still being sensitive to others.",
  },
  {
    level: 10, emoji: "🌱",
    scenario: "Someone in class has an idea that is different from yours. What do you do?",
    choices: ["Listen carefully and say 'that's interesting, I hadn't thought of that'", "Say their idea is wrong", "Talk over them", "Roll your eyes"],
    explanation: "Respecting different ideas helps everyone feel valued.",
  },
  {
    level: 11, emoji: "🤕",
    scenario: "You accidentally break something belonging to a friend. What do you do?",
    choices: ["Tell them honestly and say you're sorry", "Hide it and hope they don't notice", "Blame it on someone else", "Offer to pay for it but not apologize"],
    explanation: "Honesty and a sincere apology are the kindest responses to mistakes.",
  },
  {
    level: 12, emoji: "🛒",
    scenario: "An elderly person at the store is having trouble reaching something on a high shelf. What do you do?",
    choices: ["Offer to get it for them", "Pretend you didn't see", "Watch to see if they manage", "Wait for a store worker to come by"],
    explanation: "Small acts of help make a big difference in someone's day.",
  },
  {
    level: 13, emoji: "💬",
    scenario: "A friend shares exciting news but you're in the middle of something. What do you do?",
    choices: ["Stop what you're doing, look at them, and listen", "Say 'tell me later' and keep going", "Nod without really listening", "Say 'not now' and keep going"],
    explanation: "Giving someone your full attention is a gift.",
  },
  {
    level: 14, emoji: "😡",
    scenario: "Someone says something mean to you. How do you respond?",
    choices: ["Take a breath and say 'that wasn't kind' calmly", "Say something mean back", "Cry loudly to embarrass them", "Tell all your friends to avoid them"],
    explanation: "Responding calmly to unkindness stops the cycle from continuing.",
  },
  {
    level: 15, emoji: "🌍",
    scenario: "You learn that some kids at another school don't have books. What is a kind thing you could do?",
    choices: ["Donate books you no longer need", "Feel sad but do nothing", "Be glad it's not you", "Tell your friends but take no action"],
    explanation: "Kindness extends beyond our own circle when we choose to act.",
  },
  {
    level: 16, emoji: "🧹",
    scenario: "Your parent looks exhausted after work. The house is a little messy. What do you do?",
    choices: ["Tidy up without being asked and offer to help with dinner", "Wait to be told to clean up", "Mention that the house is messy", "Play in your room so you're out of the way"],
    explanation: "Noticing a need and acting on it without being asked is thoughtful kindness.",
  },
  {
    level: 17, emoji: "🙅",
    scenario: "Your friends want to leave someone out of a game because they're not very good at it. What do you do?",
    choices: ["Stand up for them and say everyone should be included", "Go along with your friends", "Stay quiet and feel bad inside", "Tell them to practice more first"],
    explanation: "Standing up for inclusion takes courage — that's brave kindness.",
  },
  {
    level: 18, emoji: "🌐",
    scenario: "A classmate comes from a different culture and celebrates different holidays. What do you do?",
    choices: ["Ask them to share about their traditions and celebrate their differences", "Tell them your holidays are more fun", "Avoid the topic so it's not awkward", "Treat them the same as everyone else and say nothing"],
    explanation: "Curiosity and respect for different cultures is a beautiful form of kindness.",
  },
  {
    level: 19, emoji: "📵",
    scenario: "Your grandparent doesn't understand how to use their phone. What do you do?",
    choices: ["Sit with them patiently and teach them step by step", "Do it for them every time without teaching them", "Tell them it's too complicated", "Ask your parent to handle it"],
    explanation: "Teaching someone with patience builds their confidence.",
  },
  {
    level: 20, emoji: "⭐",
    scenario: "You notice a younger student is being treated unfairly by an older student. What do you do?",
    choices: ["Calmly tell the older student to stop, and check on the younger one", "Hope a teacher sees it", "Walk past — it's not your problem", "Tell your friends about it after"],
    explanation: "Speaking up for fairness, even when it's uncomfortable, is true courage and kindness.",
  },
];
