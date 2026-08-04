// Story Ending — 20 levels, 1 story per level
// choices[0] is always the best (values-aligned) ending

export type SELevel = {
  level: number;
  title: string;
  story: string;
  prompt: string;
  choices: [string, string, string, string];
  explanation: string;
};

export const STORY_ENDING_LEVELS: SELevel[] = [
  {
    level: 1, title: "The Broken Cup",
    story: "Mia was playing inside when she accidentally knocked a cup off the table. It shattered on the floor. Nobody saw what happened.",
    prompt: "What did Mia do next?",
    choices: [
      "She told her mum right away and helped clean it up.",
      "She quietly picked up the big pieces and hid them in the bin.",
      "She left the room and pretended she didn't know what happened.",
      "She blamed the cat.",
    ],
    explanation: "Telling the truth and helping fix a mistake shows honesty and responsibility.",
  },
  {
    level: 2, title: "The New Kid",
    story: "Olu was new at school and sat alone at lunch. Everyone else was already in groups talking and laughing.",
    prompt: "What was the kindest thing to do?",
    choices: [
      "Kai walked over and said, 'You can sit with us!'",
      "Kai noticed but felt too nervous to say anything.",
      "Kai's friend said, 'Don't bother — he probably wants to be alone.'",
      "Kai waved from across the room but didn't move.",
    ],
    explanation: "Reaching out to someone who feels alone takes courage and is a beautiful act of kindness.",
  },
  {
    level: 3, title: "The Test Paper",
    story: "During a test, Ben noticed the answers on his neighbour's paper. The teacher had stepped out of the room.",
    prompt: "What did Ben do?",
    choices: [
      "He covered his paper and focused on his own work.",
      "He quickly copied a few answers, just in case.",
      "He told himself everyone does it sometimes.",
      "He waited until the teacher came back, then copied.",
    ],
    explanation: "Integrity means doing what's right even when no one is watching.",
  },
  {
    level: 4, title: "The Last Seat",
    story: "On the crowded bus, there was one seat left. An elderly woman was standing nearby, holding heavy bags.",
    prompt: "What should the child do?",
    choices: [
      "Offer the seat to the elderly woman with a smile.",
      "Sit down quickly before anyone else takes it.",
      "Pretend to be asleep so he doesn't have to decide.",
      "Sit down but feel a little guilty about it.",
    ],
    explanation: "Putting others' needs before our own comfort is a sign of love and respect.",
  },
  {
    level: 5, title: "The Muddy Football",
    story: "Aisha's team lost the big match. Some of her teammates were angry and started blaming each other.",
    prompt: "What did Aisha say?",
    choices: [
      "'We all played our hardest. Let's learn from this and try again.'",
      "'I knew you were going to mess it up!'",
      "'I'm never playing with you again.'",
      "She walked away without saying anything.",
    ],
    explanation: "Good sportsmanship means encouraging your team even after a loss.",
  },
  {
    level: 6, title: "The Dropped Wallet",
    story: "Lena found a wallet on the path with money inside. There was a name card inside. She really wanted new trainers.",
    prompt: "What did Lena do?",
    choices: [
      "She tracked down the owner and returned the wallet.",
      "She kept the money and threw away the wallet.",
      "She kept the wallet in case no one claimed it.",
      "She left it on the ground — not her problem.",
    ],
    explanation: "Returning something that doesn't belong to you is honest and brave.",
  },
  {
    level: 7, title: "The Argument",
    story: "Twins Milo and Zoe argued about what to watch on TV. Both wanted different shows. Their mum was busy.",
    prompt: "How did they solve it?",
    choices: [
      "They agreed to watch one show each, taking turns.",
      "Milo grabbed the remote and turned up the volume.",
      "Zoe cried until Milo gave in.",
      "They asked their mum to decide, ruining her evening.",
    ],
    explanation: "Compromise means both people give a little so both can be happy.",
  },
  {
    level: 8, title: "The Art Project",
    story: "Priya worked very hard on her art project. When it was displayed, a classmate said it wasn't very good.",
    prompt: "What was the best response?",
    choices: [
      "'I put a lot of effort into it and I'm proud of what I made.'",
      "She tore up her project in frustration.",
      "She cried and said she'd never do art again.",
      "She said something mean about the classmate's project.",
    ],
    explanation: "Self-confidence means valuing your own hard work regardless of others' opinions.",
  },
  {
    level: 9, title: "The Garden",
    story: "The neighbours' garden was full of litter blown in by the wind. Old Mr Chen couldn't bend down easily to pick it up.",
    prompt: "What did the children do?",
    choices: [
      "They spent Saturday morning clearing the garden as a surprise.",
      "They mentioned it to their parents and hoped someone would help.",
      "They walked past — it was the neighbour's responsibility.",
      "They looked at it sadly from their window.",
    ],
    explanation: "Serving others without being asked is one of the most generous things you can do.",
  },
  {
    level: 10, title: "The Group Project",
    story: "In the group project, one member didn't do their part. Now the whole group might get a low mark.",
    prompt: "What did the group leader do?",
    choices: [
      "She spoke to them kindly about it and helped them catch up.",
      "She told the teacher to give them a zero.",
      "She complained to her friends about how unfair it was.",
      "She did everyone's work herself and said nothing.",
    ],
    explanation: "Addressing problems with kindness instead of anger leads to better results for everyone.",
  },
  {
    level: 11, title: "The Sick Friend",
    story: "Sam was sick at home for two weeks. When he came back to school, he had missed a lot of lessons.",
    prompt: "What did his friend Joanna do?",
    choices: [
      "She shared her notes and spent time helping Sam catch up.",
      "She told Sam he'd have to figure it out on his own.",
      "She lent him her notes but made fun of how behind he was.",
      "She felt sorry for him but was too busy to help.",
    ],
    explanation: "True friendship means showing up especially when things are hard.",
  },
  {
    level: 12, title: "The Tempting Shortcut",
    story: "The class had to run a mile for fitness. Nobody was watching the last bend in the path — you could cut the corner.",
    prompt: "What did Nour do?",
    choices: [
      "She ran the full mile even though it was tiring.",
      "She cut the corner — nobody would ever know.",
      "She walked the last part but pretended to run when in view.",
      "She stopped early, saying she had a cramp.",
    ],
    explanation: "Doing things properly even when it's hard builds real character.",
  },
  {
    level: 13, title: "The Rumour",
    story: "Someone started a rumour about Ellie that wasn't true. It was spreading quickly around school.",
    prompt: "What did Ellie's friend do?",
    choices: [
      "He stood up and said, 'That's not true — stop spreading it.'",
      "He said nothing and hoped it would go away.",
      "He added a funny detail that made the rumour even worse.",
      "He told Ellie to ignore it and it would blow over.",
    ],
    explanation: "Speaking up against lies, even when it's uncomfortable, is a form of loyalty and courage.",
  },
  {
    level: 14, title: "The Charity Drive",
    story: "The school held a charity drive to collect food. Some kids bragged about how much they brought. Others felt embarrassed they couldn't bring much.",
    prompt: "What did Maisie say to her friends?",
    choices: [
      "'It doesn't matter how much — every little bit helps someone.'",
      "'I brought three bags. How much did you bring?'",
      "'Some people really should try harder.'",
      "She said nothing, not wanting to get involved.",
    ],
    explanation: "Encouraging generosity without comparison is the kindest attitude.",
  },
  {
    level: 15, title: "The Wobbly Stage",
    story: "During the school play, Theo froze with stage fright and forgot his lines. The whole audience went quiet.",
    prompt: "What did his co-star do?",
    choices: [
      "She quietly whispered his line to help him remember.",
      "She stared at him and let the silence stretch out.",
      "She said her own lines loudly to distract the audience.",
      "She laughed nervously, making things worse.",
    ],
    explanation: "Quietly helping someone in distress is a beautiful act of grace.",
  },
  {
    level: 16, title: "The Talent Show",
    story: "Rahul practised for weeks for the talent show. On the big night, he made a mistake in the middle of his performance.",
    prompt: "What did he do?",
    choices: [
      "He smiled, took a breath, and kept going to the end.",
      "He walked off the stage in embarrassment.",
      "He burst into tears in front of everyone.",
      "He pointed to a technical problem to explain the mistake.",
    ],
    explanation: "Finishing what you start, even imperfectly, takes real courage and builds resilience.",
  },
  {
    level: 17, title: "The Online Post",
    story: "Freya saw a classmate post something mean about another student online. Lots of others were liking and sharing it.",
    prompt: "What did Freya do?",
    choices: [
      "She messaged the student privately to check they were okay, and reported the post.",
      "She liked the post — she didn't want to seem uncool.",
      "She ignored it — it wasn't really her business.",
      "She screenshotted it to show her friends.",
    ],
    explanation: "Kindness online counts just as much as in person — standing up for others matters everywhere.",
  },
  {
    level: 18, title: "The Apology",
    story: "Jaylen said something hurtful to his best friend during an argument. Later, he realised he was wrong.",
    prompt: "What did Jaylen do?",
    choices: [
      "He went to his friend, looked him in the eye, and said sorry sincerely.",
      "He waited for his friend to forget about it.",
      "He apologised in a text message so it wasn't awkward.",
      "He said sorry but added 'but you started it'.",
    ],
    explanation: "A real apology is specific, sincere, and without conditions.",
  },
  {
    level: 19, title: "The Flood Appeal",
    story: "There was a big flood in another country. Thousands of families lost their homes. Imogen saw it on the news.",
    prompt: "What did Imogen do?",
    choices: [
      "She organised a fundraiser at school and donated her pocket money.",
      "She felt very sad and then went back to playing her game.",
      "She told her friends about it but didn't do anything else.",
      "She decided someone else would help — she was too young to do anything.",
    ],
    explanation: "No one is too young or too small to make a difference when they care enough to try.",
  },
  {
    level: 20, title: "The Legacy Tree",
    story: "The old oak tree at the edge of the park was going to be cut down to make space for a car park. The children in the street had played under it for generations.",
    prompt: "What did the children decide to do?",
    choices: [
      "They wrote letters, made a petition, and presented it respectfully to the council.",
      "They felt it was hopeless and did nothing.",
      "They tied themselves to the tree dramatically but had no plan.",
      "They complained to their parents and hoped adults would handle it.",
    ],
    explanation: "Speaking up for what matters — calmly and respectfully — is how communities protect what they love.",
  },
];
