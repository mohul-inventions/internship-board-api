// scripts/seed.js
// Idempotent seed script — inserts sample internships only if they do not
// already exist (matched by title + company).
// Run with:  node scripts/seed.js

import { createDatabase } from '../src/config/database.js';

const DB_PATH = process.env.DB_PATH ?? './data/internships.db';

const samples = [
  {
    title:       'Frontend Development Intern',
    company:     'Razorpay',
    domain:      'Web Development',
    location:    'Bengaluru, Karnataka',
    workMode:    'hybrid',
    description: 'Work with the design-systems team to build and maintain React component libraries used across Razorpay payment products. Write unit tests, participate in code reviews, and ship features end-to-end.',
    stipend:     25000,
    duration:    '3 months',
    applyUrl:    'https://razorpay.com/jobs/frontend-intern',
  },
  {
    title:       'Backend Engineering Intern',
    company:     'Zerodha',
    domain:      'FinTech',
    location:    'Bengaluru, Karnataka',
    workMode:    'onsite',
    description: 'Join the platform engineering team at Zerodha to build high-throughput Go microservices for real-time trade processing. Gain exposure to large-scale distributed systems handling millions of trades daily.',
    stipend:     30000,
    duration:    '6 months',
    applyUrl:    'https://zerodha.com/careers/backend-intern',
  },
  {
    title:       'Data Science Intern',
    company:     'Swiggy',
    domain:      'Data Science',
    location:    'Bengaluru, Karnataka',
    workMode:    'remote',
    description: 'Analyse customer behaviour and order patterns to improve personalised recommendations and demand forecasting models. Work with Python, SQL, and Spark on petabyte-scale datasets.',
    stipend:     20000,
    duration:    '4 months',
    applyUrl:    'https://swiggy.com/careers/data-science-intern',
  },
  {
    title:       'Machine Learning Intern',
    company:     'Google India',
    domain:      'Artificial Intelligence',
    location:    'Hyderabad, Telangana',
    workMode:    'onsite',
    description: 'Contribute to ML pipelines for Google Search ranking and ads quality. Prototype models in TensorFlow, run A/B experiments, and collaborate with researchers and engineers globally.',
    stipend:     80000,
    duration:    '3 months',
    applyUrl:    'https://careers.google.com/jobs/intern-ml',
  },
  {
    title:       'DevOps and Cloud Intern',
    company:     'Freshworks',
    domain:      'Cloud and Infrastructure',
    location:    'Chennai, Tamil Nadu',
    workMode:    'hybrid',
    description: 'Help automate CI/CD pipelines, manage AWS infrastructure with Terraform, and improve observability with Prometheus and Grafana dashboards for Freshworks SaaS suite.',
    stipend:     18000,
    duration:    '6 months',
    applyUrl:    'https://freshworks.com/careers/devops-intern',
  },
  {
    title:       'Mobile App Development Intern',
    company:     'CRED',
    domain:      'Mobile Development',
    location:    'Bengaluru, Karnataka',
    workMode:    'onsite',
    description: 'Build delightful features for CRED iOS and Android apps used by millions of premium credit card holders. Work closely with product and design to ship pixel-perfect experiences.',
    stipend:     35000,
    duration:    '3 months',
    applyUrl:    'https://cred.club/careers/mobile-intern',
  },
  {
    title:       'Cybersecurity Research Intern',
    company:     'Wipro',
    domain:      'Cybersecurity',
    location:    'Pune, Maharashtra',
    workMode:    'hybrid',
    description: 'Research emerging threat vectors, conduct vulnerability assessments, and contribute to building automated penetration testing toolkits for enterprise clients.',
    stipend:     15000,
    duration:    '6 months',
    applyUrl:    'https://wipro.com/careers/security-intern',
  },
  {
    title:       'UI/UX Design Intern',
    company:     'Meesho',
    domain:      'Design',
    location:    'Bengaluru, Karnataka',
    workMode:    'remote',
    description: 'Design intuitive e-commerce experiences for Meesho next-billion-user audience. Conduct user research, create wireframes and prototypes in Figma, and iterate based on usability testing.',
    stipend:     12000,
    duration:    '3 months',
    applyUrl:    'https://meesho.com/careers/design-intern',
  },
  {
    title:       'Product Management Intern',
    company:     'Ola',
    domain:      'Product Management',
    location:    'Bengaluru, Karnataka',
    workMode:    'hybrid',
    description: 'Own a feature from ideation to launch for Ola ride-hailing platform. Define requirements, coordinate with engineering and design, track KPIs, and present findings to leadership.',
    stipend:     22000,
    duration:    '4 months',
    applyUrl:    'https://ola.com/careers/pm-intern',
  },
  {
    title:       'Blockchain Developer Intern',
    company:     'CoinDCX',
    domain:      'Web3 and Blockchain',
    location:    'Mumbai, Maharashtra',
    workMode:    'remote',
    description: 'Build and audit smart contracts on Ethereum and Polygon. Integrate DeFi protocols with CoinDCX exchange backend and improve on-chain analytics tooling.',
    stipend:     28000,
    duration:    '3 months',
    applyUrl:    'https://coindcx.com/careers/blockchain-intern',
  },
];

(async () => {
  const db = await createDatabase(DB_PATH);

  let inserted = 0;
  for (const record of samples) {
    const existing = db
      .prepare('SELECT id FROM internships WHERE title = @title AND company = @company')
      .get({ title: record.title, company: record.company });

    if (!existing) {
      db.prepare(`
        INSERT INTO internships (title, company, domain, location, workMode, description, stipend, duration, applyUrl)
        VALUES (@title, @company, @domain, @location, @workMode, @description, @stipend, @duration, @applyUrl)
      `).run({
        title:       record.title,
        company:     record.company,
        domain:      record.domain,
        location:    record.location,
        workMode:    record.workMode,
        description: record.description,
        stipend:     record.stipend  ?? null,
        duration:    record.duration,
        applyUrl:    record.applyUrl ?? null,
      });
      inserted++;
    }
  }

  console.log(`Seed complete — ${inserted} new record(s) inserted, ${samples.length - inserted} skipped (already exist).`);
  db.close();
})();
