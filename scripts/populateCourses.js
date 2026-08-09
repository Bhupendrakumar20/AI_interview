// scripts/populateCourses.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

// Load environment variables from .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

const courses = [
  {
    id: 'dsa',
    title: 'DSA (Data Structures and Algorithms)',
    subtitle: 'Pattern recognition aur practice sabse zyada zaroori',
    badge: 'DSA',
    color: 'cyan',
    colorClass: 'from-cyan-500 to-cyan-600',
    bgClass: 'bg-cyan-500/10 border-cyan-500/30',
    resources: [
      { name: 'NeetCode', desc: 'Roadmap & Video Solutions', type: 'Platform', url: 'https://neetcode.io/' },
      { name: 'LeetCode', desc: 'Practice Platform', type: 'Practice', url: 'https://leetcode.com/' },
      { name: 'Abdul Bari Algorithms', desc: 'YouTube - White-board Logic', type: 'Video', url: 'https://youtu.be/0IAPZzGSbME?si=OTHB8ejj_-8qhZoT' },
      { name: 'Striver DSA Playlist', desc: 'YouTube - Complete DSA Series', type: 'Video', url: 'https://www.youtube.com/channel/UCvEKHATlVq84hm1jduTYm8g' },
      { name: "Striver's A2Z DSA Sheet", desc: 'Complete DSA Learning Resource', type: 'Resource', url: 'https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z' },
      { name: 'MIT OpenCourseWare (6.006)', desc: 'University-level Deep Dive', type: 'Course', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/' },
      { name: 'GeeksforGeeks', desc: 'Articles & Code Reference', type: 'Resource', url: 'https://www.geeksforgeeks.org/data-structures/' },
      { name: 'HackerRank', desc: 'Beginner-friendly Practice', type: 'Practice', url: 'https://www.hackerrank.com/domains/data-structures' },
      { name: 'Coursera - Stanford Algorithms', desc: 'Tim Roughgarden - Mathematical Approach', type: 'Course', url: 'https://www.coursera.org/specializations/algorithms' },
    ]
  },
  {
    id: 'sysdes',
    title: 'System Design',
    subtitle: 'Real-world architecture aur trade-offs samajhna',
    badge: 'SYSDES',
    color: 'violet',
    colorClass: 'from-violet-500 to-violet-600',
    bgClass: 'bg-violet-500/10 border-violet-500/30',
    resources: [
      { name: 'ByteByteGo (Alex Xu)', desc: 'Course & Book', type: 'Course', url: 'https://bytebytego.com/' },
      { name: 'Grokking System Design', desc: 'DesignGurus - Text-based Course', type: 'Course', url: 'https://www.designgurus.io/course/grokking-the-system-design-interview' },
      { name: 'System Design Primer', desc: 'GitHub - Free Collection', type: 'Resource', url: 'https://github.com/donnemartin/system-design-primer' },
      { name: 'Gaurav Sen YouTube', desc: 'Load Balancers, Caching, Microservices', type: 'Video', url: 'https://www.youtube.com/c/GauravSensei' },
      { name: 'InfoQ Architecture', desc: 'Tech Talks & Case Studies', type: 'Resource', url: 'https://www.infoq.com/architecture-design/' },
      { name: 'High Scalability', desc: 'Real-world Architecture Blog', type: 'Blog', url: 'http://highscalability.com/' },
      { name: 'Hussein Nasser YouTube', desc: 'Backend Engineering & Protocols', type: 'Video', url: 'https://www.youtube.com/c/HusseinNasser-software-engineering' },
    ]
  },
  {
    id: 'dbms',
    title: 'DBMS (Relational Database Management Systems)',
    subtitle: 'SQL se lekar database engines tak sab seekhna',
    badge: 'DBMS',
    color: 'orange',
    colorClass: 'from-orange-500 to-orange-600',
    bgClass: 'bg-orange-500/10 border-orange-500/30',
    resources: [
      { name: 'CMU Database Group', desc: 'Andy Pavlo - 15-445/645', type: 'Course', url: 'https://www.youtube.com/c/CMUDatabaseGroup' },
      { name: 'SQLBolt', desc: 'Interactive SQL Tutorial', type: 'Tutorial', url: 'https://sqlbolt.com/' },
      { name: 'Mode Analytics SQL', desc: 'Basic to Advanced SQL', type: 'Tutorial', url: 'https://mode.com/sql-tutorial/' },
      { name: 'LeetCode Database', desc: 'Complex SQL Practice', type: 'Practice', url: 'https://leetcode.com/problemset/database/' },
      { name: 'PostgreSQL Tutorial', desc: 'Official Documentation', type: 'Resource', url: 'https://www.postgresqltutorial.com/' },
      { name: 'Stanford Databases (EdX)', desc: 'Jennifer Widom - Relational Algebra', type: 'Course', url: 'https://online.stanford.edu/courses/soe-ydatabases-databases' },
      { name: 'GeeksforGeeks DBMS', desc: 'Normalization, ACID, Concurrency', type: 'Resource', url: 'https://www.geeksforgeeks.org/dbms/' },
    ]
  },
  {
    id: 'nosql',
    title: 'NoSQL',
    subtitle: 'Document, Key-Value, Column, Graph Databases',
    badge: 'NOSQL',
    color: 'emerald',
    colorClass: 'from-emerald-500 to-emerald-600',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
    resources: [
      { name: 'MongoDB University', desc: 'Free Official Courses', type: 'Course', url: 'https://learn.mongodb.com/' },
      { name: 'Redis University', desc: 'Free Official Courses', type: 'Course', url: 'https://redis.io/university/' },
      { name: 'DynamoDB Guide', desc: 'Alex DeBrie - Single-table Design', type: 'Guide', url: 'https://www.dynamodbguide.com/' },
      { name: 'Neo4j GraphAcademy', desc: 'Graph Databases', type: 'Course', url: 'https://graphacademy.neo4j.com/' },
      { name: 'DataStax Academy', desc: 'Apache Cassandra', type: 'Course', url: 'https://academy.datastax.com/' },
      { name: 'AWS NoSQL Explainer', desc: 'When to use which database', type: 'Resource', url: 'https://aws.amazon.com/nosql/' },
      { name: 'Couchbase Developer Academy', desc: 'Document Database Concepts', type: 'Course', url: 'https://developer.couchbase.com/tutorial-quickstart' },
    ]
  }
];

async function run() {
  console.log('Populating courses collection in Firestore...');
  for (const course of courses) {
    await db.collection('courses').doc(course.id).set(course);
    console.log(`Successfully populated course: ${course.id}`);
  }
  console.log('All courses and resources populated successfully!');
}

run().catch(console.error);
