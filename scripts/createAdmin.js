// scripts/createAdmin.js
const admin = require('firebase-admin');

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

async function createAdminUser() {
  try {
    const adminUser = {
      uid: 'admin_001',
      email: 'admin@careerlens.ai',
      password: 'Admin@1234',
      displayName: 'System Administrator',
      role: 'super_admin'
    };

    console.log('🚀 Creating Admin User...');

    // Create admin user in Firebase Auth
    try {
      await auth.getUser(adminUser.uid);
      console.log('✅ Admin user already exists in Auth');
    } catch (error) {
      await auth.createUser({
        uid: adminUser.uid,
        email: adminUser.email,
        password: adminUser.password,
        displayName: adminUser.displayName,
        emailVerified: true
      });
      console.log('✅ Created admin user in Firebase Auth');
    }

    // Set custom claims for admin role
    await auth.setCustomUserClaims(adminUser.uid, {
      admin: true,
      super_admin: true,
      role: 'super_admin',
      permissions: ['*']
    });

    // Create admin profile in Firestore
    const adminProfile = {
      id: adminUser.uid,
      userId: adminUser.uid,
      name: adminUser.displayName,
      email: adminUser.email,
      role: 'super_admin',
      permissions: [
        'create:any',
        'read:any',
        'update:any',
        'delete:any',
        'manage:users',
        'manage:roles',
        'manage:content',
        'manage:settings'
      ],
      bio: 'System Administrator with full access',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(adminUser.uid).set(adminProfile, { merge: true });
    console.log('✅ Created admin profile in Firestore');

    // Create admin settings
    const adminSettings = {
      id: adminUser.uid,
      userId: adminUser.uid,
      theme: 'dark',
      notifications: true,
      emailNotifications: true,
      twoFactorEnabled: false,
      lastLogin: null,
      loginHistory: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('user_settings').doc(adminUser.uid).set(adminSettings, { merge: true });
    console.log('✅ Created admin settings');

    // Create admin activity log
    const adminLog = {
      id: 'initial_setup',
      userId: adminUser.uid,
      action: 'admin_created',
      description: 'Super admin account created',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: '127.0.0.1',
      userAgent: 'Seed Script'
    };

    await db.collection('admin_logs').doc(adminLog.id).set(adminLog);
    console.log('✅ Created admin activity log');

    console.log('\n🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('====================================');
    console.log('🔑 Admin Credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${adminUser.password}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('\n⚠️  IMPORTANT: Change password after first login!');
    console.log('====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();