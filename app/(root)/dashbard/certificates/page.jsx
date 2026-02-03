// app/(root)/dashboard/certificates/page.jsx
import CertificateCard from "@/components/CertificateCard";
import { Button } from "@/components/ui/button";

export default function CertificatesPage() {
  const certificates = [
    {
      id: 1,
      title: "Advanced React Patterns",
      issuer: "Frontend Masters",
      issueDate: "2024-03-15",
      expiryDate: "No Expiry",
      credentialId: "FMA-RCT-2024-00123",
      skills: ["React", "State Management", "Performance"],
      downloadUrl: "https://certificates.frontendmasters.com/123",
      verifyUrl: "https://verify.frontendmasters.com/123",
      image: "/certificates/react.png"
    },
    {
      id: 2,
      title: "System Design Fundamentals",
      issuer: "Educative",
      issueDate: "2024-02-28",
      expiryDate: "No Expiry",
      credentialId: "EDU-SYS-2024-04567",
      skills: ["System Architecture", "Scalability", "Databases"],
      downloadUrl: "https://certificates.educative.io/456",
      verifyUrl: "https://verify.educative.io/456",
      image: "/certificates/system-design.png"
    },
    {
      id: 3,
      title: "Data Structures & Algorithms",
      issuer: "LeetCode",
      issueDate: "2024-01-20",
      expiryDate: "2026-01-20",
      credentialId: "LC-DSA-2024-08901",
      skills: ["Algorithms", "Data Structures", "Problem Solving"],
      downloadUrl: "https://certificates.leetcode.com/890",
      verifyUrl: "https://verify.leetcode.com/890",
      image: "/certificates/dsa.png"
    },
    {
      id: 4,
      title: "JavaScript Mastery",
      issuer: "Codecademy",
      issueDate: "2023-11-15",
      expiryDate: "No Expiry",
      credentialId: "CCA-JS-2023-33456",
      skills: ["JavaScript", "ES6+", "Async Programming"],
      downloadUrl: "https://certificates.codecademy.com/345",
      verifyUrl: "https://verify.codecademy.com/345",
      image: "/certificates/javascript.png"
    }
  ];

  const inProgress = [
    {
      id: 5,
      title: "AWS Certified Solutions Architect",
      issuer: "Amazon AWS",
      progress: 30,
      expectedDate: "2024-05-20",
      skills: ["AWS", "Cloud Architecture", "DevOps"]
    },
    {
      id: 6,
      title: "Machine Learning Specialization",
      issuer: "Coursera",
      progress: 45,
      expectedDate: "2024-04-30",
      skills: ["Python", "ML", "Deep Learning"]
    }
  ];

  const stats = {
    total: certificates.length,
    recent: certificates.filter(c => new Date(c.issueDate) > new Date('2024-01-01')).length,
    expiring: certificates.filter(c => c.expiryDate !== "No Expiry" && new Date(c.expiryDate) < new Date('2025-01-01')).length,
    inProgress: inProgress.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Certificates</h1>
          <p className="text-light-100">Showcase your skills and achievements</p>
        </div>
        <Button className="btn-primary">Add Certificate</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-light-100">Total Certificates</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-200">{stats.recent}</div>
            <div className="text-sm text-light-100">Recent (2024)</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.expiring}</div>
            <div className="text-sm text-light-100">Expiring Soon</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-success-100">{stats.inProgress}</div>
            <div className="text-sm text-light-100">In Progress</div>
          </div>
        </div>
      </div>

      {/* Certificates Grid */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Your Certificates</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">All</Button>
            <Button variant="ghost" size="sm">Recent</Button>
            <Button variant="ghost" size="sm">Technical</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      </section>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Certificates In Progress</h2>
          <div className="space-y-4">
            {inProgress.map((cert) => (
              <div key={cert.id} className="card-border">
                <div className="card p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{cert.title}</h3>
                      <p className="text-primary-200">{cert.issuer}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cert.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-dark-200 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-light-100 mb-2">Expected: {cert.expectedDate}</div>
                      <div className="w-48 bg-dark-200 rounded-full h-2">
                        <div 
                          className="bg-primary-200 h-2 rounded-full" 
                          style={{ width: `${cert.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-light-100 mt-1">{cert.progress}% complete</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Share Certificates */}
      <div className="card-border">
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Share Your Achievements</h2>
              <p className="text-light-100">Add certificates to your LinkedIn profile and resume</p>
            </div>
            <div className="flex gap-3">
              <Button className="btn-secondary">Export All</Button>
              <Button className="btn-primary">Share on LinkedIn</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">📄</div>
            <h3 className="font-semibold mb-2">Add to Resume</h3>
            <p className="text-sm text-light-100">Include relevant certificates in your resume</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">🔗</div>
            <h3 className="font-semibold mb-2">LinkedIn Badges</h3>
            <p className="text-sm text-light-100">Add certification badges to your profile</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold mb-2">Targeted Learning</h3>
            <p className="text-sm text-light-100">Focus on certificates that match your career goals</p>
          </div>
        </div>
      </div>
    </div>
  );
}