// PROJECT_CATEGORIES: content for the "Project Builder" screen — a curated browse-and-start
// flow only. Deliberately excludes Community Project Examples (peer submissions, likes/comments,
// verification, rewards) and "Create Your Own" (AI-driven dynamic brainstorming) — both out of
// scope; every example project below is illustrative copy, not a live community submission.
//
// `icon` is a lucide-react icon *name* (not a component) — kept as a string here since data
// files stay free of UI/React imports elsewhere in this app; ProjectBuilderScreen.jsx maps the
// name to the actual icon component.
//
// Each project type's `steps` is an ordered array of short strings (its step-by-step guide) and
// `resources` is an array of short strings (real, well-known tools/orgs) — same "array of plain
// strings" shape used for `resources`/`stepResources` elsewhere in this app, not a special format.
export const PROJECT_CATEGORIES = [
  {
    id: 'entrepreneurship',
    label: 'Entrepreneurship',
    icon: 'Rocket',
    description: 'Turn an idea into a real product, service, or venture — teaches planning, budgeting, and initiative.',
    example: "A student built a peer-to-peer tutoring platform connecting high schoolers with local middle schoolers needing extra help.",
    projectTypes: [
      {
        id: 'jewelry-ecommerce',
        name: 'Handcrafted Jewelry E-Commerce Store',
        overview: 'Design and sell a small handmade jewelry line online — learn product design, pricing, and basic e-commerce operations.',
        timeCommitment: '6–10 weeks (~3–5 hrs/week)',
        steps: [
          'Choose your jewelry style/niche',
          'Source materials and create a small starter collection',
          'Photograph your products',
          'Set up your online store',
          'Price your products and set up payments',
          'Launch and promote your store',
        ],
        resources: ['Etsy (marketplace + seller guides)', 'Shopify (store builder)', 'Canva (product photos & promo graphics)'],
      },
      {
        id: 'eco-friendly-products',
        name: 'Eco-Friendly Products Business',
        overview: 'Design, source, or make an eco-friendly product and sell it — learn sustainable sourcing, branding, and small-business basics.',
        timeCommitment: '6–10 weeks (~3–5 hrs/week)',
        steps: [
          'Identify an everyday product to make more sustainable',
          'Research suppliers and materials',
          'Create a small prototype batch',
          'Design your branding',
          'Set up an online or in-person sales channel',
          'Launch and gather customer feedback',
        ],
        resources: ["EPA's Sustainable Marketplace guide", 'Shopify (store builder)', 'Etsy (marketplace)'],
      },
      {
        id: 'coding-web-dev-business',
        name: 'Coding and Web Development Business',
        overview: 'Offer web or app development services to local businesses or individuals — learn client work, scoping, and technical delivery.',
        timeCommitment: '6–10 weeks (~4–6 hrs/week)',
        steps: [
          'Identify 2–3 potential local clients (small businesses without a site)',
          'Learn the basics of a web stack (HTML/CSS/JS or a no-code builder)',
          'Build a portfolio site of your own first',
          'Pitch your services to a client',
          'Build and deliver their site',
          'Collect feedback and a testimonial',
        ],
        resources: ['freeCodeCamp (free web dev curriculum)', 'Wix or Squarespace (client-friendly site builders)', 'GitHub (portfolio hosting)'],
      },
    ],
  },
  {
    id: 'nonprofit',
    label: 'Nonprofit / Social Entrepreneurship',
    icon: 'HeartHandshake',
    description: 'Address a real community need by building an organization, campaign, or initiative — shows leadership with purpose.',
    example: 'A student organized a free tutoring nonprofit pairing high schoolers with elementary students in an underserved neighborhood.',
    projectTypes: [
      {
        id: 'food-drive-initiative',
        name: 'Neighborhood Food Drive Initiative',
        overview: 'Organize a food drive benefiting a local shelter or food bank — learn logistics planning, volunteer recruitment, and community partnerships.',
        timeCommitment: '4–6 weeks',
        steps: [
          'Contact a local food bank/shelter about their specific needs',
          'Set a collection goal and timeline',
          'Recruit volunteers and choose collection points',
          'Promote the drive',
          'Run the collection and sort donations',
          'Deliver and reflect on impact',
        ],
        resources: ["Feeding America's guide to organizing a food drive", 'Local United Way volunteer resources'],
      },
      {
        id: 'peer-mental-health-group',
        name: 'Peer Mental Health Support Group',
        overview: 'Start a peer-led support group at your school addressing student mental health — learn facilitation, outreach, and program planning.',
        timeCommitment: 'Ongoing — 6+ weeks to establish',
        steps: [
          'Talk to a school counselor about starting a peer support group',
          "Define your group's focus and structure",
          'Get trained in peer support basics',
          'Recruit initial members',
          'Hold your first sessions',
          'Gather feedback and grow participation',
        ],
        resources: ['JED Foundation — peer support program resources', 'mentoring.org (MENTOR) — peer program frameworks', 'Your school counseling office'],
      },
      {
        id: 'environmental-cleanup-campaign',
        name: 'Environmental Cleanup Campaign',
        overview: 'Organize a cleanup event for a local park, beach, or waterway — learn event logistics, volunteer recruitment, and environmental stewardship.',
        timeCommitment: '4–6 weeks',
        steps: [
          'Choose your cleanup site and confirm any permits needed',
          'Set a date and recruit volunteers',
          'Gather supplies (gloves, bags, tools)',
          'Promote the event',
          'Run the cleanup and track what you collect',
          'Report your impact',
        ],
        resources: ["Ocean Conservancy's International Coastal Cleanup guide", "Keep America Beautiful's cleanup toolkit", 'Local parks department volunteer resources'],
      },
    ],
  },
  {
    id: 'research',
    label: 'Independent Research',
    icon: 'Microscope',
    description: 'Investigate a genuine question using real research methods — shows intellectual curiosity and independence.',
    example: 'A student surveyed 200 classmates to study the relationship between sleep habits and academic performance at their school.',
    projectTypes: [
      {
        id: 'local-environmental-study',
        name: 'Local Environmental Science Study',
        overview: 'Design and run a small original environmental study in your community — learn the scientific method, field data collection, and analysis.',
        timeCommitment: '6–10 weeks',
        steps: [
          'Choose a local environmental question (water quality, air quality, biodiversity)',
          'Design your data collection method',
          'Collect data over several weeks',
          'Analyze your results',
          'Write up your findings',
          'Share your results (science fair, school, or local publication)',
        ],
        resources: ["EPA's citizen science resources", 'iNaturalist (biodiversity data collection)', 'Google Sheets (data analysis)'],
      },
      {
        id: 'social-media-teen-wellbeing',
        name: "Social Media's Impact on Teen Wellbeing",
        overview: 'Research how social media use relates to teen mental health or wellbeing through a survey or literature review — learn research design and ethical survey practices.',
        timeCommitment: '6–8 weeks',
        steps: [
          'Narrow your research question',
          'Review existing studies on the topic',
          'Design a survey or interview protocol',
          'Collect responses from peers (with consent)',
          'Analyze your data for patterns',
          'Write up your findings',
        ],
        resources: ["Common Sense Media's research library", 'Google Forms (survey collection)', 'JED Foundation — teen mental health research'],
      },
      {
        id: 'local-history-landmark',
        name: 'History of a Local Community or Landmark',
        overview: 'Research and document the history of a place in your community — learn archival research and oral history methods.',
        timeCommitment: '6–8 weeks',
        steps: [
          'Choose your landmark or community topic',
          "Visit your local library/historical society for archival records",
          'Conduct 2–3 oral history interviews with longtime residents',
          'Organize your findings into a narrative',
          'Write up or present your history',
          'Share it with your local historical society or library',
        ],
        resources: ["Library of Congress's oral history guide", 'Your local historical society archives', "National History Day's research resources"],
      },
    ],
  },
  {
    id: 'stem',
    label: 'STEM Projects',
    icon: 'Cpu',
    description: 'Explore science, technology, engineering, or math hands-on — shows technical skill and creative problem-solving.',
    example: 'A student built a low-cost weather station using sensors and a Raspberry Pi to collect local climate data for a community science fair.',
    projectTypes: [
      {
        id: 'robotics-project',
        name: 'Robotics Project',
        overview: 'Build a simple robot to solve a specific problem or complete a task — learn basic electronics, programming, and mechanical design.',
        timeCommitment: '6–10 weeks (~4–6 hrs/week)',
        steps: [
          'Define what your robot will do',
          'Choose your platform (Arduino, LEGO Mindstorms, or Raspberry Pi)',
          'Sketch your design and gather parts',
          'Build and wire your robot',
          'Program its behavior',
          'Test and refine',
        ],
        resources: ["Arduino's official Getting Started Guide", 'LEGO Mindstorms tutorials', 'Raspberry Pi Foundation project guides'],
      },
      {
        id: 'mobile-app-development',
        name: 'Mobile App Development',
        overview: 'Develop a simple mobile app to solve a problem in your school or community — learn coding, project management, and user-centered design.',
        timeCommitment: '4–8 weeks (~3–5 hrs/week)',
        steps: [
          "Define the problem your app will solve",
          "Sketch your app's layout and features",
          'Choose a development platform (e.g., Thunkable, Flutter)',
          'Build a prototype',
          'Test and gather feedback',
          'Launch and share your app',
        ],
        resources: ['Thunkable (no-code app builder)', 'Flutter (open-source SDK)', 'Figma (design mockups)'],
      },
      {
        id: 'renewable-energy',
        name: 'Renewable Energy',
        overview: 'Build a small working model that demonstrates a renewable energy concept (solar, wind, or hydro) — learn engineering fundamentals and energy science.',
        timeCommitment: '6–10 weeks (~4–6 hrs/week)',
        steps: [
          'Choose your energy source (solar, wind, or hydro)',
          "Research how it's converted to usable power",
          'Sketch your model design',
          'Gather parts and build your model',
          'Test and measure its output',
          'Present your findings and improvements',
        ],
        resources: ["Department of Energy's Energy Kids resources", 'KidWind (wind energy education kits)', "Science Buddies' renewable energy project guides"],
      },
    ],
  },
  {
    id: 'writing',
    label: 'Writing & Literature',
    icon: 'BookOpen',
    description: 'Develop your voice as a writer through fiction, poetry, or nonfiction — shows discipline and creative vision.',
    example: "A student wrote and self-published a short story collection exploring their family's immigration story.",
    projectTypes: [
      {
        id: 'short-story-collection',
        name: 'Short Story Collection',
        overview: 'Write and compile a themed collection of short stories — develop your voice and build a real body of creative work.',
        timeCommitment: '8–12 weeks',
        steps: [
          'Choose a unifying theme',
          'Outline 4–6 story ideas',
          'Draft each story',
          'Get feedback from peers/teachers',
          'Revise and polish',
          'Compile into a finished collection',
        ],
        resources: ["NaNoWriMo's Young Writers Program", "Reedsy's free writing resources"],
      },
      {
        id: 'personal-blog-newsletter',
        name: 'Personal Blog or Newsletter',
        overview: 'Start a regularly-published blog or newsletter around a topic you care about — build a writing habit and a real audience.',
        timeCommitment: 'Ongoing — 2–4 hrs/week',
        steps: [
          'Choose your topic/niche',
          'Pick a platform',
          'Plan your first 4–6 posts',
          'Write and publish your first post',
          'Build a simple posting schedule',
          'Promote and grow your readership',
        ],
        resources: ['Substack (newsletter platform)', 'WordPress (blog platform)', 'Medium (writing platform with built-in audience)'],
      },
      {
        id: 'local-history-zine',
        name: 'Local History Zine',
        overview: 'Research, write, and self-publish a zine (small booklet) about a piece of local history or culture — combine research and creative design.',
        timeCommitment: '6–8 weeks',
        steps: [
          'Choose your local history topic',
          'Research through interviews and archives',
          'Draft your written content',
          "Design your zine's layout",
          'Print or publish a digital copy',
          'Share/distribute it locally',
        ],
        resources: ['Canva (zine layout templates)', 'Your local historical society archives', "Reedsy's free writing resources"],
      },
    ],
  },
  {
    id: 'arts',
    label: 'Arts',
    icon: 'Palette',
    description: 'Create original visual art, music, film, or performance work — shows creative vision and follow-through.',
    example: 'A student created a mural series for their school reflecting the diverse cultures of their student body.',
    projectTypes: [
      {
        id: 'photography-series',
        name: 'Photography Series',
        overview: 'Create a themed photography series that tells a visual story — develop technical skill and a personal creative voice.',
        timeCommitment: '4–8 weeks',
        steps: [
          'Choose your theme or subject',
          'Research composition/lighting techniques',
          'Shoot your series over several sessions',
          'Select and edit your best shots',
          'Present or exhibit your final series',
        ],
        resources: ["National Geographic's photography tips", "Adobe Lightroom's free tutorials"],
      },
      {
        id: 'short-film',
        name: 'Short Film',
        overview: 'Write, shoot, and edit an original short film — learn storytelling, basic filmmaking, and post-production.',
        timeCommitment: '8–12 weeks',
        steps: [
          'Write your script or outline',
          'Plan your shots and locations',
          'Gather your cast/crew and equipment',
          'Film your scenes',
          'Edit your footage',
          'Share or submit your finished film',
        ],
        resources: ['DaVinci Resolve (free video editing software)', "No Film School's beginner filmmaking guides", 'FilmFreeway (festival submission platform)'],
      },
      {
        id: 'original-music-ep',
        name: 'Original Music EP',
        overview: 'Write, record, and release a short original music collection (EP) — develop your musical voice and basic production skills.',
        timeCommitment: '8–12 weeks',
        steps: [
          'Write and demo 3–5 original songs',
          'Choose your recording setup (home studio or local studio)',
          'Record your tracks',
          'Mix and master your EP',
          'Design your cover art',
          'Release your EP online',
        ],
        resources: ['GarageBand or Audacity (free recording/production software)', 'DistroKid or Bandcamp (music release platforms)', 'Canva (cover art design)'],
      },
    ],
  },
];

export function findCategory(categoryId) {
  return PROJECT_CATEGORIES.find((c) => c.id === categoryId) || null;
}

export function findProjectType(categoryId, projectTypeId) {
  const category = findCategory(categoryId);
  if (!category) return null;
  const projectType = category.projectTypes.find((p) => p.id === projectTypeId);
  return projectType ? { category, projectType } : null;
}
