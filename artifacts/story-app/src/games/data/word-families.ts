// Word Families — 20 levels
// Each level has exactly 2 word families (endings) and 6 words (3 per family).
// Player sorts words into the correct family.

export type WFFamily = { ending: string; emoji: string; words: string[] };

export type WFLevel = {
  level: number;
  families: [WFFamily, WFFamily];
};

export const WORD_FAMILIES_LEVELS: WFLevel[] = [
  { level: 1,  families: [{ ending: "-at", emoji: "🐱", words: ["cat","hat","bat"] }, { ending: "-an", emoji: "🧑", words: ["man","can","fan"] }] },
  { level: 2,  families: [{ ending: "-ig", emoji: "🐷", words: ["big","pig","wig"] }, { ending: "-og", emoji: "🐸", words: ["dog","log","fog"] }] },
  { level: 3,  families: [{ ending: "-et", emoji: "🕸️", words: ["net","set","wet"] }, { ending: "-en", emoji: "🐔", words: ["hen","ten","pen"] }] },
  { level: 4,  families: [{ ending: "-ip", emoji: "💧", words: ["dip","lip","tip"] }, { ending: "-it", emoji: "✂️", words: ["bit","hit","sit"] }] },
  { level: 5,  families: [{ ending: "-op", emoji: "🛑", words: ["hop","top","mop"] }, { ending: "-ug", emoji: "🐛", words: ["bug","hug","mug"] }] },
  { level: 6,  families: [{ ending: "-ake", emoji: "🎂", words: ["cake","lake","make"] }, { ending: "-ike", emoji: "🚲", words: ["bike","hike","like"] }] },
  { level: 7,  families: [{ ending: "-ine", emoji: "🌲", words: ["pine","vine","mine"] }, { ending: "-ose", emoji: "🌹", words: ["rose","nose","hose"] }] },
  { level: 8,  families: [{ ending: "-eat", emoji: "🥩", words: ["beat","heat","seat"] }, { ending: "-eel", emoji: "🎡", words: ["feel","heel","peel"] }] },
  { level: 9,  families: [{ ending: "-ight", emoji: "💡", words: ["night","light","right"] }, { ending: "-old", emoji: "🏆", words: ["gold","bold","fold"] }] },
  { level: 10, families: [{ ending: "-ound", emoji: "🔔", words: ["found","round","sound"] }, { ending: "-ouse", emoji: "🏠", words: ["house","mouse","louse"] }] },
  { level: 11, families: [{ ending: "-ain", emoji: "🌧️", words: ["rain","train","plain"] }, { ending: "-eak", emoji: "🐦", words: ["beak","sneak","speak"] }] },
  { level: 12, families: [{ ending: "-ace", emoji: "🏁", words: ["race","place","space"] }, { ending: "-age", emoji: "📖", words: ["page","cage","stage"] }] },
  { level: 13, families: [{ ending: "-are", emoji: "🐇", words: ["hare","share","stare"] }, { ending: "-ire", emoji: "🔥", words: ["fire","tire","wire"] }] },
  { level: 14, families: [{ ending: "-oom", emoji: "🌙", words: ["room","bloom","broom"] }, { ending: "-ool", emoji: "🏊", words: ["pool","cool","tool"] }] },
  { level: 15, families: [{ ending: "-ink", emoji: "🖊️", words: ["pink","think","drink"] }, { ending: "-ang", emoji: "🔔", words: ["rang","sang","bang"] }] },
  { level: 16, families: [{ ending: "-ong", emoji: "🎵", words: ["song","strong","belong"] }, { ending: "-ung", emoji: "🫁", words: ["sung","lung","rung"] }] },
  { level: 17, families: [{ ending: "-atch", emoji: "⚽", words: ["match","catch","hatch"] }, { ending: "-itch", emoji: "🧙", words: ["witch","stitch","ditch"] }] },
  { level: 18, families: [{ ending: "-tion", emoji: "📢", words: ["nation","motion","station"] }, { ending: "-ness", emoji: "💙", words: ["kindness","darkness","softness"] }] },
  { level: 19, families: [{ ending: "-ful", emoji: "⭐", words: ["hopeful","playful","careful"] }, { ending: "-less", emoji: "🌑", words: ["fearless","careless","helpless"] }] },
  { level: 20, families: [{ ending: "-ment", emoji: "🏅", words: ["moment","movement","statement"] }, { ending: "-ence", emoji: "🔬", words: ["science","silence","patience"] }] },
];
