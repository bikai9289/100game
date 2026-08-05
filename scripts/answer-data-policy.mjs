export const womenCategoryCorrections = new Map([
  ["D'arcy Wretzky", 'musicians'],
  ['Elizabeth Stokes', 'musicians'],
  ['Emma Richardson', 'musicians'],
  ['Gail Greenwood', 'musicians'],
  ['Melissa Auf der Maur', 'musicians'],
  ['Paz Lenchantin', 'musicians'],
  ['Rachel Goswell', 'musicians'],
  ['Radie Peat', 'musicians'],
  ['Romy Madley Croft', 'musicians'],
  ['Ruth Radelet', 'musicians'],
  ['Victoria Legrand', 'musicians'],
  ['Kalpana Chawla', 'scientists'],
  ['Laurel Clark', 'scientists'],
  ['Stephanie Wilson', 'scientists'],
  ['Barbara Morgan', 'scientists'],
  ['Dorothy Metcalf-Lindenburger', 'scientists'],
  ['Karen Nyberg', 'scientists'],
  ['Tracy Caldwell Dyson', 'scientists'],
  ['Shannon Walker', 'scientists'],
  ['Catherine Coleman', 'scientists'],
  ['Sunita Williams', 'scientists'],
  ['Anne McClain', 'scientists'],
  ['Christina Koch', 'scientists'],
  ['Jessica Meir', 'scientists'],
  ['Jasmin Moghbeli', 'scientists'],
  ['Nicole Mann', 'scientists'],
]);

export const requiredWomenAnswers = [
  {
    name: 'Michelle Obama',
    aliases: ['Michelle Robinson Obama'],
    category: 'politicians',
    hint: 'Former First Lady of the United States and public leader',
  },
  {
    name: 'Melania Trump',
    aliases: ['Melania Knauss Trump'],
    category: 'politicians',
    hint: 'First Lady of the United States',
  },
  {
    name: 'Catherine, Princess of Wales',
    aliases: ['Kate Middleton', 'Catherine Middleton'],
    category: 'politicians',
    hint: 'British royal and public figure',
  },
  {
    name: 'Rosa Parks',
    aliases: [],
    category: 'activists',
    hint: 'American civil rights activist',
  },
  {
    name: 'Marie Curie',
    aliases: [],
    category: 'scientists',
    hint: 'Physicist and chemist; two-time Nobel Prize winner',
  },
  {
    name: 'Ada Lovelace',
    aliases: ['Augusta Ada King'],
    category: 'scientists',
    hint: 'Mathematician and early computing pioneer',
  },
  {
    name: 'Serena Williams',
    aliases: [],
    category: 'athletes',
    hint: 'Tennis champion',
  },
  {
    name: 'Diana, Princess of Wales',
    aliases: ['Princess Diana', 'Diana Spencer'],
    category: 'historical',
    hint: 'British royal and humanitarian',
  },
  {
    name: 'Cleopatra',
    aliases: [],
    category: 'historical',
    hint: 'Queen of ancient Egypt',
  },
  {
    name: 'Frida Kahlo',
    aliases: [],
    category: 'other',
    hint: 'Mexican painter and cultural icon',
  },
  {
    name: 'Jane Austen',
    aliases: [],
    category: 'historical',
    hint: 'English novelist',
  },
  {
    name: 'Maya Angelou',
    aliases: [],
    category: 'other',
    hint: 'American poet, memoirist, and author',
  },
  {
    name: 'Malala Yousafzai',
    aliases: [],
    category: 'activists',
    hint: 'Education activist and Nobel Peace Prize laureate',
  },
  {
    name: 'Greta Thunberg',
    aliases: [],
    category: 'activists',
    hint: 'Climate activist',
  },
  {
    name: 'Amelia Earhart',
    aliases: [],
    category: 'historical',
    hint: 'Aviation pioneer',
  },
  {
    name: 'Margaret Thatcher',
    aliases: [],
    category: 'politicians',
    hint: 'Former Prime Minister of the United Kingdom',
  },
  {
    name: 'Hillary Clinton',
    aliases: ['Hillary Rodham Clinton'],
    category: 'politicians',
    hint: 'American politician and former Secretary of State',
  },
  {
    name: 'Kamala Harris',
    aliases: [],
    category: 'politicians',
    hint: 'American politician and former vice president',
  },
  {
    name: 'Elizabeth II',
    aliases: ['Queen Elizabeth II'],
    category: 'historical',
    hint: 'Former Queen of the United Kingdom',
  },
  {
    name: 'Mother Teresa',
    aliases: ['Teresa of Calcutta'],
    category: 'activists',
    hint: 'Humanitarian and Nobel Peace Prize laureate',
  },
  {
    name: 'Virginia Woolf',
    aliases: [],
    category: 'historical',
    hint: 'English writer and modernist',
  },
  {
    name: 'Helen Keller',
    aliases: [],
    category: 'activists',
    hint: 'Author, educator, and disability-rights advocate',
  },
  {
    name: 'Harriet Tubman',
    aliases: [],
    category: 'activists',
    hint: 'American abolitionist and activist',
  },
  {
    name: "Georgia O'Keeffe",
    aliases: ['Georgia Totto O Keeffe'],
    category: 'other',
    hint: 'American modernist artist',
  },
];

export function normalizeAnswerText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSafeAnswerAlias(value) {
  return normalizeAnswerText(value).includes(' ');
}
