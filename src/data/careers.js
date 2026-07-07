// CAREERS[track][level] -> array of 3 career cards.
// 'highschool' and 'transfer' education levels see the same (undergrad-track) careers;
// 'undergraduate' sees more advanced careers that require a graduate degree next.

export const CAREERS = {
  business: {
    highschool: [
      {
        id: 'business-analyst',
        name: 'Business Analyst',
        overview: 'Helps companies improve processes and make data-informed decisions.',
        salary: '~$75k–$95k',
        requiredEducation: "Bachelor's in Business or related field",
        relevantMajors: ['business-administration', 'finance', 'economics'],
      },
      {
        id: 'entrepreneur',
        name: 'Entrepreneur / Founder',
        overview: 'Builds and runs a new business or venture from the ground up.',
        salary: 'Highly variable',
        requiredEducation: "Bachelor's common but not required",
        relevantMajors: ['business-administration', 'entrepreneurship', 'marketing'],
      },
      {
        id: 'marketing-manager',
        name: 'Marketing Manager',
        overview: 'Leads campaigns and brand strategy for a company or product.',
        salary: '~$70k–$140k',
        requiredEducation: "Bachelor's in Marketing or Business",
        relevantMajors: ['marketing', 'communications', 'business-administration'],
      },
    ],
    undergraduate: [
      {
        id: 'management-consultant',
        name: 'Management Consultant',
        overview: 'Advises companies on strategy, operations, and organizational change at a senior level.',
        salary: '~$90k–$150k',
        requiredEducation: "Master's (often an MBA)",
        relevantMajors: ['mba'],
      },
      {
        id: 'investment-banker',
        name: 'Investment Banker / Finance Director',
        overview: 'Leads high-stakes financial deals, capital raising, and investment strategy for firms or clients.',
        salary: '~$100k–$200k+',
        requiredEducation: "Master's in Finance or MBA",
        relevantMajors: ['ms-finance', 'mba'],
      },
      {
        id: 'marketing-director',
        name: 'Marketing Director',
        overview: 'Owns brand and growth strategy across an entire product line or company.',
        salary: '~$110k–$180k',
        requiredEducation: "Master's in Marketing Analytics or MBA",
        relevantMajors: ['ms-marketing-analytics', 'mba'],
      },
    ],
  },
  stem: {
    highschool: [
      {
        id: 'software-engineer',
        name: 'Software Engineer',
        overview: 'Designs and builds applications and systems.',
        salary: '~$85k–$130k',
        requiredEducation: "Bachelor's in CS or related",
        relevantMajors: ['computer-science', 'software-engineering', 'computer-engineering'],
      },
      {
        id: 'mechanical-engineer',
        name: 'Mechanical Engineer',
        overview: 'Designs physical systems and mechanical products.',
        salary: '~$70k–$95k',
        requiredEducation: "Bachelor's in Mechanical Engineering",
        relevantMajors: ['mechanical-engineering', 'aerospace-engineering'],
      },
      {
        id: 'data-scientist',
        name: 'Data Scientist',
        overview: 'Analyzes data to find patterns and guide decisions.',
        salary: '~$90k–$140k',
        requiredEducation: "Bachelor's/Master's in a quantitative field",
        relevantMajors: ['data-science', 'statistics', 'computer-science'],
      },
    ],
    undergraduate: [
      {
        id: 'ml-engineer',
        name: 'Machine Learning Engineer / AI Research Scientist',
        overview: 'Builds and researches the models behind modern AI systems.',
        salary: '~$120k–$180k',
        requiredEducation: "Master's or PhD in CS or related",
        relevantMajors: ['ms-ai-ml'],
      },
      {
        id: 'robotics-engineer',
        name: 'Robotics Engineer',
        overview: 'Designs autonomous systems that combine mechanical, electrical, and software engineering.',
        salary: '~$95k–$150k',
        requiredEducation: "Master's in Robotics or Mechanical Engineering",
        relevantMajors: ['ms-robotics'],
      },
      {
        id: 'senior-data-scientist',
        name: 'Quantitative Researcher / Senior Data Scientist',
        overview: 'Leads advanced modeling and research work, often in finance, tech, or applied science.',
        salary: '~$130k–$200k',
        requiredEducation: "Master's or PhD in Statistics, CS, or Applied Math",
        relevantMajors: ['ms-data-science'],
      },
    ],
  },
};

// Transfer students see the same undergraduate-level careers as high schoolers.
CAREERS.business.transfer = CAREERS.business.highschool;
CAREERS.stem.transfer = CAREERS.stem.highschool;
