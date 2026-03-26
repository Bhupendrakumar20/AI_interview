// scripts/seedDatabase.js
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase with your credentials
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "careerlens-ai-37c8b",
    clientEmail: "firebase-adminsdk-fbsvc@careerlens-ai-37c8b.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAgM8DTzj90/Kv\ndKbsdU7XrWilDaxWIU0kqIVlJb44aTwCxq24dNEKaIuEXiUJPtDaShbYcwTKCQIH\naWk1x/zLKE208hfbkzinuTQ3pEkcjSnzKDZBU1waFC/S4uOlouhkNpOkLG4Cj8ve\ne74s0dryd4KpfV9u/Bd55ruUqiH1QVr621QMcyEaETLvQd2i0Zlb1R6gE4QPWBui\n/osvpW88Vvjet1yNgihGCPT0E88Oi2h6P5FyplACAvbx/e8wvzaZ4Vm9/QmXnVlT\npTeuA94crgoY2eHdtomECHKpMgMOU/C4hP81Gri7ZbVJOMqLV+V/OEvh3fc59WYd\nMIUtL0wvAgMBAAECggEAMNxg7wOcQR0bc7plpg4OcYLz1TUXwZLZTE0z8pz2X8Yi\nM8gvDusjpgMsKnBk8ShPBaEZlF35YLiRmcUBLePxf7Vep+ds89A16KiDHv5likgw\nViYmQ0V/0qS+EMaDJqcnWkxaBCk80Qyjn/iDqEepzbJU6WVHpFl7MfdFNHJMhT3c\nbLgvWE3TGYuiaNRYitQKze4mMK9eIYiQnQft3DN7HO3wVsV1Ub2w9jrw/l9o+baH\nKKod18rs/z2AqwMhpP/FRh97ay627JNB501qh2kXgP/43O9PJmyjIs848WA+S1jw\nglP7cKSpiSutotoMDkqCWEwq60iaB3WLMPVMhgDecQKBgQD6vPHmv9MTpObhVE3I\njDNlPRnXynJdrTY2MG6BG8QCyai8dEj8BJlb4Lyd2FtOexcKBp00f6UcJa78NzVv\nlPdFsyqRIsZ1Y4WFa30/ewewV27d5rGzM8ppmnmAkKyHynkwF7lyUvka4a/jT6wD\nkAhoE++ONEwFHMLoZzTWFgZNUQKBgQDEiwE91Het3dWy/euybBtCHg4cI2h85eda\nAfSe1R+xdud/OB4eT1IpMGm5NIHfA1R304vbA+/amwOfnVp9j0c3pEHgBuKcbrmc\nwcboxg4OJKvFrcmYipOp6aE7gsbYvZ82P1r4dJX5suDz7Izsxgm938a7q59738Cy\ngVXKer+hfwKBgD8jiyqXDVj6AmWla/zfSSXqL/LF+Oyb7HXS1lDOpBorm8Dw61wC\n8HdRbU22KK/nkRKmPbn1lqcy2hCK+nrBoU684jAv+Jeg2wOQ4LY2jeYa7kEUkZTV\nqtfS3VvBkqCTHNc+ciVWvYHGaRstedxfza4frwg5JRd4eaA6NPTgEPAxAoGBAKSt\nD1I99jTAfPAnHtf1CnXAdvQOmtqjSs+4ebynN5Ha3aZTX7DnpyCJxtt96h7wTFLF\n9hWA2/PfFA8lqY8wgGxXfTZ2rmKBx5VXKxEX+OjSwvWzYgkkewrPjN8u+OrbHk42\nkUNBc/OudBsMpRsx5zGnEH1oFA2XcX5fLYGkjXGDAoGAY/XWxfkVATxB4wTGEnx2\nGE6TABztdlQIMv6HIm0sfxFT2zqYYsffY+qAcKcV1xYnnZaRHV+MGVSxhVWeeIXF\ncCrZRkPKxxyrBtszYvqWMWEic5WzSXtAQVmOQixrplNhou6fb66TdjVQHdLO30BU\nk62CnXwbZyA/IRK2ARSw5AY=\n-----END PRIVATE KEY-----\n"
  }),
  databaseURL: "https://careerlens-ai-37c8b.firebaseio.com"
});

const db = admin.firestore();
const auth = admin.auth();

// Current timestamp
const now = admin.firestore.Timestamp.now();
const oneMonthAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

// Main user for testing
const MAIN_USER = {
  uid: 'user_123456',
  email: 'bhupendra@example.com',
  password: 'Test123!',
  displayName: 'Bhupendra Kumar'
};

// ==================== HELPER FUNCTIONS ====================
async function createUser() {
  try {
    // Check if user exists
    try {
      await auth.getUser(MAIN_USER.uid);
      console.log(`✅ User ${MAIN_USER.email} already exists`);
    } catch (error) {
      // Create user if doesn't exist
      await auth.createUser({
        uid: MAIN_USER.uid,
        email: MAIN_USER.email,
        password: MAIN_USER.password,
        displayName: MAIN_USER.displayName,
        emailVerified: true
      });
      console.log(`✅ Created user: ${MAIN_USER.email}`);
    }
    
    // Create user profile
    const userProfile = {
      id: MAIN_USER.uid,
      userId: MAIN_USER.uid,
      name: MAIN_USER.displayName,
      email: MAIN_USER.email,
      bio: 'CS student passionate about web development and AI',
      skills: ['React', 'Node.js', 'Python', 'DSA', 'Next.js', 'Firebase'],
      resumeURL: 'https://drive.google.com/resume.pdf',
      github: 'https://github.com/bhupendra',
      linkedin: 'https://linkedin.com/in/bhupendra',
      portfolio: 'https://bhupendra.dev',
      experience: '2 years',
      education: 'B.Tech Computer Science',
      createdAt: oneMonthAgo,
      updatedAt: now
    };
    
    await db.collection('user_profiles').doc(MAIN_USER.uid).set(userProfile);
    console.log('✅ Created user profile');
    
    return MAIN_USER.uid;
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

async function clearCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✅ Cleared ${collectionName} collection`);
  } catch (error) {
    console.log(`ℹ️ ${collectionName} collection doesn't exist or already empty`);
  }
}

// ==================== SEED DATA ====================
async function seedDatabase() {
  console.log('Starting prepWise AI Database Seeding...');
  console.log('=============================================');

  try {
    // 1. Create main user
    console.log('\nStep 1: Creating main user...');
    const userId = await createUser();

    // 2. Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\nStep 2: Clearing existing data...');
    const collections = [
      'interviews', 'feedback', 'internships', 'jobs', 'competitions',
      'mentors', 'courses', 'user_applications', 'user_certificates',
      'user_progress', 'bookmarked_questions', 'user_watchlist',
      'mock_tests', 'user_sessions', 'user_settings'
    ];
    
    for (const collection of collections) {
      await clearCollection(collection);
    }

    // 3. Seed interviews
    console.log('\nStep 3: Seeding interviews...');
    const interviews = [
      {
        id: 'interview_1',
        userId: userId,
        role: 'Frontend Developer',
        company: 'Google',
        level: 'Senior',
        type: 'Technical',
        techstack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
        questions: [
          'Explain the Virtual DOM in React',
          'How does React handle state updates?',
          'What are React hooks and when would you use them?',
          'Explain server-side rendering in Next.js'
        ],
        finalized: true,
        createdAt: oneMonthAgo,
        updatedAt: now
      },
      {
        id: 'interview_2',
        userId: userId,
        role: 'Full Stack Developer',
        company: 'Microsoft',
        level: 'Mid',
        type: 'Mixed',
        techstack: ['Node.js', 'Express', 'MongoDB', 'React'],
        questions: [
          'Explain REST API principles',
          'How would you structure a full-stack application?',
          'What is middleware in Express?',
          'How do you handle authentication?'
        ],
        finalized: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
        updatedAt: now
      },
      {
        id: 'interview_3',
        userId: userId,
        role: 'Backend Developer',
        company: 'Amazon',
        level: 'Senior',
        type: 'Technical',
        techstack: ['Python', 'Django', 'PostgreSQL', 'AWS'],
        questions: [
          'Explain database indexing',
          'How do you handle database migrations?',
          'What is connection pooling?',
          'Explain API rate limiting'
        ],
        finalized: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
        updatedAt: now
      }
    ];

    for (const interview of interviews) {
      await db.collection('interviews').doc(interview.id).set(interview);
    }
    console.log(`Added ${interviews.length} interviews`);

    // 4. Seed feedback
    console.log('\nStep 4: Seeding feedback...');
    const feedbacks = [
      {
        id: 'feedback_1',
        interviewId: 'interview_1',
        userId: userId,
        transcript: [
          { role: 'system', content: 'Question 1: Explain the Virtual DOM in React' },
          { role: 'user', content: 'Virtual DOM is a lightweight copy of the actual DOM that React uses to optimize updates.' },
          { role: 'system', content: 'Question 2: How does React handle state updates?' },
          { role: 'user', content: 'React batches state updates and uses a reconciliation algorithm to update the DOM efficiently.' }
        ],
        totalScore: 85,
        categoryScores: [
          { name: 'Communication Skills', score: 90, comment: 'Clear and concise explanations' },
          { name: 'Technical Knowledge', score: 85, comment: 'Good understanding of React concepts' },
          { name: 'Problem Solving', score: 80, comment: 'Logical approach to problems' },
          { name: 'Cultural Fit', score: 85, comment: 'Good team player mindset' },
          { name: 'Confidence and Clarity', score: 85, comment: 'Confident delivery' }
        ],
        strengths: [
          'Strong React fundamentals',
          'Clear communication',
          'Good problem-solving approach'
        ],
        areasForImprovement: [
          'Could provide more real-world examples',
          'Should explain trade-offs in more detail'
        ],
        finalAssessment: 'Strong candidate with good React knowledge. Would benefit from more practical experience.',
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const feedback of feedbacks) {
      await db.collection('feedback').doc(feedback.id).set(feedback);
    }
    console.log(`✅ Added ${feedbacks.length} feedback entries`);

    // 5. Seed internships
    console.log('\n💼 Step 5: Seeding internships...');
    const internships = [
      {
        id: 'intern_google',
        title: 'Software Engineer Intern',
        company: 'Google',
        description: 'Join Google\'s engineering team to work on cutting-edge projects. Mentorship provided.',
        location: 'Mountain View, CA / Remote',
        duration: '3 months',
        stipend: '$8,000/month',
        deadline: '2024-04-15',
        type: 'tech',
        skills: ['Python', 'Java', 'C++', 'Algorithms', 'Data Structures'],
        requirements: [
          'Currently pursuing BS/MS in CS or related field',
          'Strong problem-solving skills',
          'Experience with data structures and algorithms'
        ],
        perks: ['Housing Stipend', 'Free Meals', 'Networking Events', 'Return Offer Potential'],
        applicants: 1250,
        featured: true,
        badge: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'intern_oneday',
        title: 'One Day Internship with Ankit',
        company: 'with Ankit',
        description: 'Experience a day in the life of a Google engineer. Shadow and learn from Ankit.',
        location: 'Remote',
        duration: '1 day',
        stipend: 'Certificate + Network',
        deadline: '2024-03-25',
        type: 'quick',
        skills: ['Quick Learning', 'Networking', 'Communication'],
        requirements: ['Open to all students', 'Basic programming knowledge'],
        perks: ['Certificate', 'LinkedIn Recommendation', 'Networking'],
        applicants: 250,
        featured: true,
        badge: 'One Day',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'intern_meta',
        title: 'Frontend Developer Intern',
        company: 'Meta',
        description: 'Build user interfaces for Facebook, Instagram, or WhatsApp.',
        location: 'Menlo Park, CA',
        duration: '4 months',
        stipend: '$7,500/month',
        deadline: '2024-04-10',
        type: 'tech',
        skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'GraphQL'],
        applicants: 980,
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const internship of internships) {
      await db.collection('internships').doc(internship.id).set(internship);
    }
    console.log(`✅ Added ${internships.length} internships`);

    // 6. Seed jobs
    console.log('\n💰 Step 6: Seeding jobs...');
    const jobs = [
      {
        id: 'job_netflix',
        title: 'Senior Frontend Engineer',
        company: 'Netflix',
        description: 'Build user interfaces for Netflix\'s streaming platform',
        location: 'Los Gatos, CA',
        salary: '$180,000 - $250,000',
        experience: '5+ years',
        type: 'Full-time',
        skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'CSS'],
        requirements: [
          '5+ years of frontend development experience',
          'Strong understanding of React ecosystem',
          'Experience with performance optimization'
        ],
        benefits: [
          'Unlimited vacation',
          'Stock options',
          'Health insurance',
          'Remote work options'
        ],
        applicants: 850,
        posted: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'job_microsoft',
        title: 'Backend Developer',
        company: 'Microsoft',
        description: 'Work on Azure cloud services and backend infrastructure',
        location: 'Redmond, WA',
        salary: '$160,000 - $220,000',
        experience: '3+ years',
        type: 'Full-time',
        skills: ['Node.js', 'Python', 'AWS', 'PostgreSQL'],
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const job of jobs) {
      await db.collection('jobs').doc(job.id).set(job);
    }
    console.log(`✅ Added ${jobs.length} jobs`);

    // 7. Seed competitions
    console.log('\n🏆 Step 7: Seeding competitions...');
    const competitions = [
      {
        id: 'comp_ingenium',
        title: 'Quest Ingenium',
        organizer: 'Engineering Association',
        description: 'Solve the world\'s hardest engineering problems',
        prize: '₹2,00,000',
        deadline: '2024-04-30',
        participants: 50000,
        tags: ['Engineering', 'Innovation', 'Hardware'],
        requirements: [
          'Open to all engineering students',
          'Individual or team participation',
          'Submit project proposal'
        ],
        timeline: [
          { stage: 'Registration', date: '2024-03-01' },
          { stage: 'Submission', date: '2024-04-15' },
          { stage: 'Results', date: '2024-04-30' }
        ],
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'comp_tbo',
        title: 'tbo.com Challenge',
        organizer: 'Travel Brand Online',
        description: 'Build innovative travel solutions',
        prize: '₹3,00,000',
        deadline: '2024-05-15',
        participants: 30000,
        tags: ['Travel', 'Tech', 'Startup'],
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const competition of competitions) {
      await db.collection('competitions').doc(competition.id).set(competition);
    }
    console.log(`✅ Added ${competitions.length} competitions`);

    // 8. Seed mentors
    console.log('\n👥 Step 8: Seeding mentors...');
    const mentors = [
      {
        id: 'mentor_ankit',
        name: 'Ankit Kumar',
        role: 'Senior Engineer @ Google',
        experience: '8 years',
        rating: 4.9,
        sessions: 245,
        expertise: ['System Design', 'Algorithms', 'Career Growth'],
        availability: ['Mon', 'Wed', 'Fri'],
        rate: '$100/hour',
        bio: 'I help students crack top tech company interviews. Specialized in system design and algorithms.',
        achievements: [
          '10+ years at Google',
          'Mentored 200+ students',
          'Google Hiring Committee member'
        ],
        languages: ['English', 'Hindi'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'mentor_priya',
        name: 'Priya Sharma',
        role: 'Product Manager @ Meta',
        experience: '6 years',
        rating: 4.8,
        sessions: 189,
        expertise: ['Product Strategy', 'UX Design', 'Leadership'],
        availability: ['Tue', 'Thu'],
        rate: '$120/hour',
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const mentor of mentors) {
      await db.collection('mentors').doc(mentor.id).set(mentor);
    }
    console.log(`✅ Added ${mentors.length} mentors`);

    // 9. Seed courses
    console.log('\n📚 Step 9: Seeding courses...');
    const courses = [
      {
        id: 'course_react',
        title: 'Advanced React Patterns',
        instructor: 'Sarah Johnson',
        provider: 'Frontend Masters',
        description: 'Master advanced React patterns and best practices',
        duration: '24 hours',
        level: 'Advanced',
        category: 'Frontend',
        modules: [
          { title: 'State Management Patterns', duration: '4 hours' },
          { title: 'Performance Optimization', duration: '5 hours' },
          { title: 'Testing Strategies', duration: '3 hours' }
        ],
        rating: 4.8,
        students: 15000,
        price: 299,
        certificate: true,
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'course_dsa',
        title: 'Data Structures & Algorithms',
        instructor: 'Mike Wilson',
        provider: 'LeetCode',
        description: 'Master DSA for technical interviews',
        duration: '50 hours',
        level: 'Intermediate',
        category: 'Computer Science',
        rating: 4.7,
        students: 50000,
        price: 199,
        certificate: true,
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const course of courses) {
      await db.collection('courses').doc(course.id).set(course);
    }
    console.log(`✅ Added ${courses.length} courses`);

    // 10. Seed user applications
    console.log('\n📄 Step 10: Seeding user applications...');
    const userApplications = [
      {
        id: 'app_google',
        userId: userId,
        opportunityId: 'intern_google',
        opportunityType: 'internship',
        title: 'Software Engineer Intern',
        company: 'Google',
        status: 'Under Review',
        appliedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
        progress: [
          { stage: 'Applied', completed: true, date: '2024-03-15' },
          { stage: 'OA', completed: true, date: '2024-03-20' },
          { stage: 'Technical', completed: false, date: 'Pending' },
          { stage: 'HR', completed: false, date: 'Pending' }
        ],
        notes: 'Waiting for technical round schedule',
        updatedAt: now
      },
      {
        id: 'app_netflix',
        userId: userId,
        opportunityId: 'job_netflix',
        opportunityType: 'job',
        title: 'Senior Frontend Engineer',
        company: 'Netflix',
        status: 'Interview Scheduled',
        appliedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
        progress: [
          { stage: 'Applied', completed: true, date: '2024-03-20' },
          { stage: 'Screening', completed: true, date: '2024-03-25' },
          { stage: 'Technical', completed: true, date: '2024-03-28' },
          { stage: 'System Design', completed: false, date: '2024-04-05' }
        ],
        updatedAt: now
      }
    ];

    for (const application of userApplications) {
      await db.collection('user_applications').doc(application.id).set(application);
    }
    console.log(`✅ Added ${userApplications.length} user applications`);

    // 11. Seed user certificates
    console.log('\n📜 Step 11: Seeding user certificates...');
    const userCertificates = [
      {
        id: 'cert_react',
        userId: userId,
        title: 'Advanced React Patterns',
        issuer: 'Frontend Masters',
        issueDate: '2024-03-15',
        expiryDate: null,
        credentialId: 'FMA-RCT-2024-00123',
        skills: ['React', 'State Management', 'Performance'],
        downloadUrl: 'https://certificates.frontendmasters.com/123',
        verifyUrl: 'https://verify.frontendmasters.com/123',
        createdAt: now
      }
    ];

    for (const certificate of userCertificates) {
      await db.collection('user_certificates').doc(certificate.id).set(certificate);
    }
    console.log(`✅ Added ${userCertificates.length} user certificates`);

    // 12. Seed user progress
    console.log('\n📈 Step 12: Seeding user progress...');
    const userProgress = [
      {
        id: 'progress_100days',
        userId: userId,
        challengeId: '100-days-code',
        day: 15,
        completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        currentStreak: 15,
        longestStreak: 15,
        totalPoints: 1500,
        enrolledAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
        lastActive: now,
        updatedAt: now
      }
    ];

    for (const progress of userProgress) {
      await db.collection('user_progress').doc(progress.id).set(progress);
    }
    console.log(`✅ Added ${userProgress.length} user progress entries`);

    // 13. Seed bookmarked questions
    console.log('\n⭐ Step 13: Seeding bookmarked questions...');
    const bookmarkedQuestions = [
      {
        id: 'bookmark_1',
        userId: userId,
        question: 'Explain the Virtual DOM in React and how it improves performance.',
        category: 'React',
        difficulty: 'Medium',
        tags: ['React', 'Virtual DOM', 'Performance'],
        addedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
        notes: 'Practice with reconciliation algorithm example',
        lastPracticed: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
        practiceCount: 3
      },
      {
        id: 'bookmark_2',
        userId: userId,
        question: 'Design a URL shortening service like TinyURL.',
        category: 'System Design',
        difficulty: 'Hard',
        tags: ['System Design', 'Scalability', 'Database'],
        addedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
        notes: 'Focus on hash generation and collision handling',
        lastPracticed: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        practiceCount: 2
      }
    ];

    for (const bookmark of bookmarkedQuestions) {
      await db.collection('bookmarked_questions').doc(bookmark.id).set(bookmark);
    }
    console.log(`✅ Added ${bookmarkedQuestions.length} bookmarked questions`);

    // 14. Seed user watchlist
    console.log('\n👀 Step 14: Seeding user watchlist...');
    const userWatchlist = [
      {
        id: 'watch_google',
        userId: userId,
        itemId: 'intern_google',
        itemType: 'internship',
        title: 'Software Engineer Intern',
        company: 'Google',
        addedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        expiresAt: '2024-04-15',
        alerts: true,
        notes: 'High priority application',
        updatedAt: now
      },
      {
        id: 'watch_ingenium',
        userId: userId,
        itemId: 'comp_ingenium',
        itemType: 'competition',
        title: 'Quest Ingenium',
        organizer: 'Engineering Association',
        addedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
        expiresAt: '2024-04-30',
        alerts: true,
        updatedAt: now
      }
    ];

    for (const watch of userWatchlist) {
      await db.collection('user_watchlist').doc(watch.id).set(watch);
    }
    console.log(`✅ Added ${userWatchlist.length} watchlist items`);

    // 15. Seed mock tests
    console.log('\n📝 Step 15: Seeding mock tests...');
    const mockTests = [
      {
        id: 'test_dsa',
        title: 'DSA Mock Test 2024',
        category: 'Data Structures',
        duration: 120,
        questions: 50,
        difficulty: 'Medium',
        topics: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming'],
        description: 'Comprehensive DSA test for technical interviews',
        passingScore: 70,
        attempts: 1250,
        averageScore: 68,
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'test_frontend',
        title: 'Frontend Development Test',
        category: 'Frontend',
        duration: 90,
        questions: 40,
        difficulty: 'Medium',
        topics: ['React', 'JavaScript', 'CSS', 'Performance'],
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const test of mockTests) {
      await db.collection('mock_tests').doc(test.id).set(test);
    }
    console.log(`✅ Added ${mockTests.length} mock tests`);

    // 16. Seed user sessions
    console.log('\n🎯 Step 16: Seeding user sessions...');
    const userSessions = [
      {
        id: 'session_1',
        userId: userId,
        mentorId: 'mentor_ankit',
        title: 'System Design Interview Prep',
        type: 'Mock Interview',
        scheduledAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        duration: 60,
        status: 'upcoming',
        meetingLink: 'https://meet.google.com/xyz-abc-def',
        preparation: 'Review system design basics and scaling concepts',
        notes: 'Focus on designing Twitter-like system',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'session_2',
        userId: userId,
        mentorId: 'mentor_priya',
        title: 'Product Manager Interview',
        type: 'Mentorship',
        scheduledAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        duration: 45,
        status: 'completed',
        feedback: 'Great product thinking. Work on metric definition.',
        score: 85,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const session of userSessions) {
      await db.collection('user_sessions').doc(session.id).set(session);
    }
    console.log(`✅ Added ${userSessions.length} user sessions`);

    // 17. Seed user settings
    console.log('\n⚙️ Step 17: Seeding user settings...');
    const userSettings = {
      id: userId,
      userId: userId,
      camera: true,
      notifications: true,
      emailNotifications: true,
      theme: 'dark',
      language: 'en',
      updatedAt: now
    };

    await db.collection('user_settings').doc(userId).set(userSettings);
    console.log('✅ Added user settings');

    console.log('\n=============================================');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('\n📊 SUMMARY OF DATA ADDED:');
    console.log('   👤 User: 1 (Bhupendra Kumar)');
    console.log(`   🎤 Interviews: ${interviews.length}`);
    console.log(`   📊 Feedback: ${feedbacks.length}`);
    console.log(`   💼 Internships: ${internships.length}`);
    console.log(`   💰 Jobs: ${jobs.length}`);
    console.log(`   🏆 Competitions: ${competitions.length}`);
    console.log(`   👥 Mentors: ${mentors.length}`);
    console.log(`   📚 Courses: ${courses.length}`);
    console.log(`   📄 Applications: ${userApplications.length}`);
    console.log(`   📜 Certificates: ${userCertificates.length}`);
    console.log(`   📈 Progress: ${userProgress.length}`);
    console.log(`   ⭐ Bookmarks: ${bookmarkedQuestions.length}`);
    console.log(`   👀 Watchlist: ${userWatchlist.length}`);
    console.log(`   📝 Mock Tests: ${mockTests.length}`);
    console.log(`   🎯 Sessions: ${userSessions.length}`);
    console.log(`   ⚙️ Settings: 1`);
    
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log(`   Email: ${MAIN_USER.email}`);
    console.log(`   Password: ${MAIN_USER.password}`);
    
    console.log('\n✅ All data has been successfully seeded to Firebase!');
    console.log('🚀 Your PrepWise AI platform is now ready to use!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR SEEDING DATABASE:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();