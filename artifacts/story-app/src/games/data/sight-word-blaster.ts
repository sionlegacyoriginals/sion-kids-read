// Sight Word Blaster — 20 levels, 5 questions per level
// Each question: show a sentence with the target word highlighted, pick the matching word from 4 cards.
// Levels 1-5: pre-primer Dolch words | 6-10: primer | 11-15: 1st grade | 16-20: 2nd/3rd grade

export type SWBQuestion = {
  target: string;
  sentence: string;       // sentence containing the target word (bold hint)
  choices: [string, string, string, string];  // choices[0] is always correct
};

export type SWBLevel = {
  level: number;
  questions: SWBQuestion[];
};

export const SIGHT_WORD_LEVELS: SWBLevel[] = [
  {
    level: 1,
    questions: [
      { target: "the", sentence: 'Find the word: "the"', choices: ["the", "a", "is", "I"] },
      { target: "a", sentence: 'Find the word: "a"', choices: ["a", "I", "in", "it"] },
      { target: "I", sentence: 'Find the word: "I"', choices: ["I", "a", "to", "the"] },
      { target: "is", sentence: 'Find the word: "is"', choices: ["is", "it", "in", "if"] },
      { target: "to", sentence: 'Find the word: "to"', choices: ["to", "too", "two", "the"] },
    ],
  },
  {
    level: 2,
    questions: [
      { target: "in", sentence: 'The cat is in the box.', choices: ["in", "it", "is", "if"] },
      { target: "it", sentence: 'It is a big dog.', choices: ["it", "in", "is", "I"] },
      { target: "and", sentence: 'Sam and Jan play.', choices: ["and", "an", "at", "add"] },
      { target: "see", sentence: 'I can see the moon.', choices: ["see", "she", "sea", "bee"] },
      { target: "we", sentence: 'We like to run.', choices: ["we", "me", "be", "he"] },
    ],
  },
  {
    level: 3,
    questions: [
      { target: "my", sentence: 'That is my hat.', choices: ["my", "me", "by", "may"] },
      { target: "up", sentence: 'Look up at the sky.', choices: ["up", "us", "cup", "on"] },
      { target: "big", sentence: 'The big bear sleeps.', choices: ["big", "bag", "pig", "bid"] },
      { target: "go", sentence: 'We go to school.', choices: ["go", "got", "do", "so"] },
      { target: "can", sentence: 'I can jump high.', choices: ["can", "tan", "cap", "cat"] },
    ],
  },
  {
    level: 4,
    questions: [
      { target: "run", sentence: 'The kids run fast.', choices: ["run", "rub", "fun", "sun"] },
      { target: "not", sentence: 'I am not tired.', choices: ["not", "hot", "not", "dot"] },
      { target: "you", sentence: 'Can you help me?', choices: ["you", "your", "our", "out"] },
      { target: "she", sentence: 'She has a red bag.', choices: ["she", "the", "he", "see"] },
      { target: "he", sentence: 'He is my friend.', choices: ["he", "me", "we", "be"] },
    ],
  },
  {
    level: 5,
    questions: [
      { target: "they", sentence: 'They play in the park.', choices: ["they", "then", "the", "than"] },
      { target: "was", sentence: 'She was very happy.', choices: ["was", "has", "saw", "way"] },
      { target: "for", sentence: 'This gift is for you.', choices: ["for", "far", "fun", "four"] },
      { target: "on", sentence: 'The cup is on the table.', choices: ["on", "an", "in", "one"] },
      { target: "are", sentence: 'We are best friends.', choices: ["are", "or", "our", "air"] },
    ],
  },
  {
    level: 6,
    questions: [
      { target: "look", sentence: 'Look at that butterfly!', choices: ["look", "book", "hook", "cook"] },
      { target: "said", sentence: 'She said hello to me.', choices: ["said", "sand", "sail", "sale"] },
      { target: "come", sentence: 'Please come inside.', choices: ["come", "some", "came", "home"] },
      { target: "have", sentence: 'I have two brothers.', choices: ["have", "gave", "save", "cave"] },
      { target: "here", sentence: 'Come over here.', choices: ["here", "there", "hare", "hear"] },
    ],
  },
  {
    level: 7,
    questions: [
      { target: "little", sentence: 'The little mouse hid.', choices: ["little", "litter", "title", "battle"] },
      { target: "make", sentence: 'Let\'s make a cake.', choices: ["make", "take", "lake", "bake"] },
      { target: "want", sentence: 'Do you want more?', choices: ["want", "went", "wand", "band"] },
      { target: "now", sentence: 'It is raining now.', choices: ["now", "how", "know", "new"] },
      { target: "eat", sentence: 'Birds eat seeds.', choices: ["eat", "heat", "seat", "beat"] },
    ],
  },
  {
    level: 8,
    questions: [
      { target: "who", sentence: 'Who ate my porridge?', choices: ["who", "how", "two", "why"] },
      { target: "did", sentence: 'She did a good job.', choices: ["did", "dip", "dig", "dim"] },
      { target: "down", sentence: 'The sun goes down.', choices: ["down", "town", "gown", "own"] },
      { target: "get", sentence: 'Let\'s get ready.', choices: ["get", "got", "set", "net"] },
      { target: "good", sentence: 'What a good idea!', choices: ["good", "food", "wood", "mood"] },
    ],
  },
  {
    level: 9,
    questions: [
      { target: "must", sentence: 'We must be quiet.', choices: ["must", "gust", "rust", "dust"] },
      { target: "like", sentence: 'I like stars.', choices: ["like", "bike", "hike", "mike"] },
      { target: "play", sentence: 'They play soccer.', choices: ["play", "clay", "slay", "hay"] },
      { target: "ride", sentence: 'I can ride a horse.', choices: ["ride", "hide", "side", "wide"] },
      { target: "soon", sentence: 'It will be summer soon.', choices: ["soon", "moon", "noon", "boon"] },
    ],
  },
  {
    level: 10,
    questions: [
      { target: "your", sentence: 'Is this your pencil?', choices: ["your", "you", "four", "pour"] },
      { target: "from", sentence: 'A letter from grandma.', choices: ["from", "form", "firm", "farm"] },
      { target: "they", sentence: 'They walked to school.', choices: ["they", "the", "these", "then"] },
      { target: "went", sentence: 'She went to the store.', choices: ["went", "dent", "bent", "lent"] },
      { target: "this", sentence: 'This book is great.', choices: ["this", "that", "thin", "with"] },
    ],
  },
  {
    level: 11,
    questions: [
      { target: "after", sentence: 'After lunch we rest.', choices: ["after", "often", "actor", "other"] },
      { target: "again", sentence: 'Read the story again.', choices: ["again", "began", "again", "chain"] },
      { target: "every", sentence: 'Every dog loves walks.', choices: ["every", "even", "ever", "very"] },
      { target: "round", sentence: 'The earth is round.', choices: ["round", "found", "sound", "mound"] },
      { target: "think", sentence: 'I think it will rain.', choices: ["think", "thing", "drink", "thank"] },
    ],
  },
  {
    level: 12,
    questions: [
      { target: "about", sentence: 'Tell me about your trip.', choices: ["about", "above", "shout", "doubt"] },
      { target: "always", sentence: 'She always shares.', choices: ["always", "almost", "also", "along"] },
      { target: "never", sentence: 'I never give up.', choices: ["never", "every", "lever", "sever"] },
      { target: "bring", sentence: 'Please bring your book.', choices: ["bring", "ring", "string", "thing"] },
      { target: "found", sentence: 'I found a treasure.', choices: ["found", "round", "sound", "wound"] },
    ],
  },
  {
    level: 13,
    questions: [
      { target: "because", sentence: 'I smiled because I was happy.', choices: ["because", "before", "beside", "became"] },
      { target: "carry", sentence: 'Can you carry this bag?', choices: ["carry", "harry", "marry", "tarry"] },
      { target: "clean", sentence: 'Please clean your room.', choices: ["clean", "lean", "mean", "bean"] },
      { target: "eight", sentence: 'There are eight planets.', choices: ["eight", "eighty", "night", "fight"] },
      { target: "today", sentence: 'Today is sunny.', choices: ["today", "toad", "delay", "relay"] },
    ],
  },
  {
    level: 14,
    questions: [
      { target: "light", sentence: 'Turn off the light.', choices: ["light", "night", "right", "sight"] },
      { target: "start", sentence: 'Let\'s start the race.', choices: ["start", "stare", "store", "stark"] },
      { target: "place", sentence: 'This is a great place.', choices: ["place", "peace", "plane", "plate"] },
      { target: "together", sentence: 'We learn together.', choices: ["together", "whether", "tether", "neither"] },
      { target: "write", sentence: 'I write in my journal.', choices: ["write", "white", "quite", "kite"] },
    ],
  },
  {
    level: 15,
    questions: [
      { target: "though", sentence: 'Even though it rained, we played.', choices: ["though", "through", "thought", "tough"] },
      { target: "enough", sentence: 'We have enough food.', choices: ["enough", "tough", "rough", "cough"] },
      { target: "neighbor", sentence: 'Our neighbor is kind.', choices: ["neighbor", "weigh", "height", "eight"] },
      { target: "beautiful", sentence: 'The sunset is beautiful.', choices: ["beautiful", "bountiful", "grateful", "plentiful"] },
      { target: "different", sentence: 'We are different and equal.', choices: ["different", "difficult", "distance", "definite"] },
    ],
  },
  {
    level: 16,
    questions: [
      { target: "special", sentence: 'You are very special.', choices: ["special", "spatial", "species", "spiral"] },
      { target: "question", sentence: 'I have a question.', choices: ["question", "mention", "section", "tension"] },
      { target: "important", sentence: 'It is important to try.', choices: ["important", "impolite", "impatient", "imperfect"] },
      { target: "family", sentence: 'I love my family.', choices: ["family", "fancy", "famine", "famous"] },
      { target: "usually", sentence: 'We usually eat at home.', choices: ["usually", "actually", "equally", "mutually"] },
    ],
  },
  {
    level: 17,
    questions: [
      { target: "through", sentence: 'We ran through the park.', choices: ["through", "though", "thought", "thorough"] },
      { target: "between", sentence: 'Sit between us.', choices: ["between", "beneath", "beyond", "below"] },
      { target: "several", sentence: 'I read several books.', choices: ["several", "general", "federal", "literal"] },
      { target: "something", sentence: 'I found something cool.', choices: ["something", "somewhere", "sometimes", "somehow"] },
      { target: "themselves", sentence: 'They did it themselves.', choices: ["themselves", "yourselves", "ourselves", "himself"] },
    ],
  },
  {
    level: 18,
    questions: [
      { target: "continue", sentence: 'Please continue reading.', choices: ["continue", "contain", "contend", "control"] },
      { target: "discover", sentence: 'Scientists discover new things.', choices: ["discover", "discuss", "display", "displace"] },
      { target: "measure", sentence: 'We can measure the room.', choices: ["measure", "treasure", "leisure", "pleasure"] },
      { target: "prepare", sentence: 'Let\'s prepare for the test.', choices: ["prepare", "compare", "declare", "beware"] },
      { target: "result", sentence: 'Hard work gives a good result.', choices: ["result", "resort", "insult", "exult"] },
    ],
  },
  {
    level: 19,
    questions: [
      { target: "although", sentence: 'Although it was hard, she kept going.', choices: ["although", "already", "altogether", "alright"] },
      { target: "therefore", sentence: 'It was dark; therefore we lit candles.', choices: ["therefore", "wherever", "whenever", "however"] },
      { target: "experience", sentence: 'This trip was an experience.', choices: ["experience", "existence", "excellence", "evidence"] },
      { target: "probably", sentence: 'It will probably rain.', choices: ["probably", "possibly", "properly", "proudly"] },
      { target: "information", sentence: 'We found the information online.', choices: ["information", "imagination", "examination", "combination"] },
    ],
  },
  {
    level: 20,
    questions: [
      { target: "environment", sentence: 'We protect the environment.', choices: ["environment", "entertainment", "encouragement", "engagement"] },
      { target: "communicate", sentence: 'Words help us communicate.', choices: ["communicate", "celebrate", "concentrate", "cooperate"] },
      { target: "responsible", sentence: 'Be responsible with your things.', choices: ["responsible", "reasonable", "remarkable", "repeatable"] },
      { target: "community", sentence: 'We help our community.', choices: ["community", "commodity", "humidity", "formality"] },
      { target: "perseverance", sentence: 'Perseverance means not giving up.', choices: ["perseverance", "performance", "permanence", "prevalence"] },
    ],
  },
];
