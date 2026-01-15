import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Feature {
  name: string;
  description: string;
  highlights: string[];
}

interface FeatureCategory {
  title: string;
  icon: string;
  features: Feature[];
}

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

const featureCategories: FeatureCategory[] = [
  {
    title: '👨‍🎓 Student Management',
    icon: '🎓',
    features: [
      {
        name: 'Student Registration & Profiles',
        description: 'Complete student information management with photo uploads',
        highlights: [
          'Personal details, guardian information, and emergency contacts',
          'Photo management with cloud storage',
          'Unique Student ID generation',
          'Class and section assignment'
        ]
      },
      {
        name: 'Student ID Cards',
        description: 'Professional ID card generation with QR codes',
        highlights: [
          'Aesthetic vertical card design',
          'QR code for attendance scanning',
          'School branding and student photo',
          'Individual and bulk download options'
        ]
      },
      {
        name: 'Student Portal',
        description: 'Dedicated portal for students to access their information',
        highlights: [
          'View timetable and assignments',
          'Access study materials',
          'Check attendance records',
          'View exam results and grades'
        ]
      }
    ]
  },
  {
    title: '👨‍🏫 Teacher Management',
    icon: '📚',
    features: [
      {
        name: 'Teacher Profiles',
        description: 'Comprehensive teacher information and department assignment',
        highlights: [
          'Qualification and specialization tracking',
          'Department and subject assignment',
          'Employee ID management',
          'Salary and joining date records'
        ]
      },
      {
        name: 'Teacher ID Cards',
        description: 'Professional teacher ID cards with green theme',
        highlights: [
          'Distinct design from student cards',
          'QR code for attendance',
          'Department and designation display',
          'Bulk generation for entire departments'
        ]
      },
      {
        name: 'Teacher Portal',
        description: 'Portal for teachers to manage their classes',
        highlights: [
          'Mark student attendance',
          'Upload study materials',
          'Create and grade assignments',
          'Enter exam results'
        ]
      }
    ]
  },
  {
    title: '👨‍👩‍👧 Parent Portal',
    icon: '👪',
    features: [
      {
        name: 'Children Overview',
        description: 'View all linked children and their academic progress',
        highlights: [
          'Multiple children support',
          'Quick access to each child\'s data',
          'Download Detailed Marks Certificates',
          'View attendance history'
        ]
      },
      {
        name: 'Fee Management',
        description: 'Track and manage children\'s fee payments',
        highlights: [
          'View pending and paid fees',
          'Download payment receipts',
          'Payment history tracking',
          'Fee due date notifications'
        ]
      },
      {
        name: 'Communication',
        description: 'Stay updated with school announcements',
        highlights: [
          'View school announcements',
          'Notification preferences',
          'SMS and email alerts',
          'Absence notifications'
        ]
      }
    ]
  },
  {
    title: '📊 Admin Dashboard',
    icon: '⚙️',
    features: [
      {
        name: 'Analytics & Statistics',
        description: 'Comprehensive overview of school operations',
        highlights: [
          'Student enrollment statistics',
          'Attendance summaries',
          'Fee collection analytics',
          'Class-wise distribution charts'
        ]
      },
      {
        name: 'Quick Actions',
        description: 'Fast access to common administrative tasks',
        highlights: [
          'Pending admissions review',
          'Today\'s absent students list',
          'Recent activity feed',
          'System notifications'
        ]
      },
      {
        name: 'Search & Reports',
        description: 'Powerful search and reporting capabilities',
        highlights: [
          'Global student search',
          'Custom report generation',
          'Export to PDF and Excel',
          'Filter by class, date, status'
        ]
      }
    ]
  },
  {
    title: '📝 Attendance System',
    icon: '✅',
    features: [
      {
        name: 'QR Code Scanner',
        description: 'Fast attendance marking using QR codes',
        highlights: [
          'Camera-based QR scanning',
          'Automatic late detection (after 8:30 AM)',
          'Manual ID entry fallback',
          'Real-time attendance updates'
        ]
      },
      {
        name: 'Attendance Reports',
        description: 'Detailed attendance tracking and reporting',
        highlights: [
          'Daily, weekly, monthly reports',
          'Class-wise attendance summary',
          'Individual student reports',
          'PDF export with school branding'
        ]
      },
      {
        name: 'Parent Notifications',
        description: 'Automatic alerts for absent students',
        highlights: [
          'Email notifications',
          'SMS/WhatsApp alerts',
          'Configurable notification times',
          'Absence reason tracking'
        ]
      }
    ]
  },
  {
    title: '💰 Fee Management',
    icon: '💳',
    features: [
      {
        name: 'Fee Structure',
        description: 'Flexible fee configuration by class and type',
        highlights: [
          'Multiple fee types (tuition, transport, etc.)',
          'Class-specific fee structures',
          'Recurring fee support',
          'Due date management'
        ]
      },
      {
        name: 'Payment Processing',
        description: 'Record and track all fee payments',
        highlights: [
          'Multiple payment methods',
          'Discount management',
          'Receipt generation',
          'Transaction history'
        ]
      },
      {
        name: 'Fee Reports',
        description: 'Comprehensive fee analytics and reports',
        highlights: [
          'Class-wise fee reports',
          'Individual student invoices',
          'Collection summary',
          'Pending dues tracking'
        ]
      }
    ]
  },
  {
    title: '📚 Exam & Results',
    icon: '📋',
    features: [
      {
        name: 'Exam Management',
        description: 'Create and schedule exams with details',
        highlights: [
          'Multiple exam types (term, monthly, weekly)',
          'Subject-wise exam scheduling',
          'Max marks and passing marks',
          'Exam date and time management'
        ]
      },
      {
        name: 'Result Entry',
        description: 'Streamlined marks entry system',
        highlights: [
          'Bulk marks entry',
          'Automatic grade calculation',
          'Theory and practical marks',
          'Award list generation'
        ]
      },
      {
        name: 'Certificates',
        description: 'Professional result documentation',
        highlights: [
          'Roll Number Slips',
          'Detailed Marks Certificates (DMC)',
          'Class-wise result sheets',
          'Marks in words conversion'
        ]
      }
    ]
  },
  {
    title: '📅 Timetable Management',
    icon: '🗓️',
    features: [
      {
        name: 'Class Timetables',
        description: 'Weekly timetable for each class',
        highlights: [
          'Day and period-wise scheduling',
          'Subject and teacher assignment',
          'Room number allocation',
          'Conflict detection'
        ]
      },
      {
        name: 'Teacher Schedules',
        description: 'View teacher-specific timetables',
        highlights: [
          'Weekly class schedule',
          'Class reminders (10 min before)',
          'Workload distribution',
          'Free period identification'
        ]
      }
    ]
  },
  {
    title: '📢 Communication',
    icon: '📣',
    features: [
      {
        name: 'Announcements',
        description: 'School-wide announcement system',
        highlights: [
          'Priority levels (normal, important, urgent)',
          'Target audience selection',
          'Publish/unpublish control',
          'Rich text content'
        ]
      },
      {
        name: 'Notifications',
        description: 'In-app and push notifications',
        highlights: [
          'Real-time notification bell',
          'Unread count badge',
          'Notification history',
          'Link to relevant pages'
        ]
      }
    ]
  },
  {
    title: '📁 Study Materials',
    icon: '📖',
    features: [
      {
        name: 'Material Upload',
        description: 'Teachers can upload study resources',
        highlights: [
          'Multiple file types support',
          'Subject and class assignment',
          'Description and titles',
          'Secure file storage'
        ]
      },
      {
        name: 'Student Access',
        description: 'Students can download materials',
        highlights: [
          'Class-specific materials',
          'Secure download links',
          'Organized by subject',
          'Search and filter'
        ]
      }
    ]
  },
  {
    title: '🏫 Admissions',
    icon: '📝',
    features: [
      {
        name: 'Online Application',
        description: 'Public admission form for new students',
        highlights: [
          'Student and parent details',
          'Photo upload support',
          'Previous school information',
          'Document checklist'
        ]
      },
      {
        name: 'Application Review',
        description: 'Admin review and approval workflow',
        highlights: [
          'Pending applications list',
          'Approve/reject with notes',
          'Auto student ID generation',
          'Status tracking'
        ]
      },
      {
        name: 'Admission Form PDF',
        description: 'Generate complete admission forms',
        highlights: [
          'All student details',
          'Parent information',
          'Login credentials',
          'Document checklist'
        ]
      }
    ]
  },
  {
    title: '🖼️ Gallery',
    icon: '🎨',
    features: [
      {
        name: 'Image Management',
        description: 'Manage school gallery images',
        highlights: [
          'Upload and organize images',
          'Description and ordering',
          'Visibility control',
          'Public display on landing page'
        ]
      }
    ]
  }
];

export const generateProjectFeaturesPdf = async (): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Colors
  const primaryColor: [number, number, number] = [30, 58, 138]; // Royal blue
  const secondaryColor: [number, number, number] = [59, 130, 246]; // Lighter blue
  const goldColor: [number, number, number] = [202, 138, 4]; // Gold accent

  // ===== COVER PAGE =====
  // Background gradient effect
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative elements
  doc.setFillColor(59, 130, 246);
  doc.circle(pageWidth - 30, 50, 60, 'F');
  doc.circle(30, pageHeight - 50, 40, 'F');

  // Try to add logo
  try {
    const logoImg = await loadImage('/images/school-logo.png');
    doc.addImage(logoImg, 'PNG', pageWidth / 2 - 25, 40, 50, 50);
  } catch {
    // Skip logo if not available
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah Public School', pageWidth / 2, 110, { align: 'center' });
  doc.text('& College', pageWidth / 2, 122, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', pageWidth / 2, 135, { align: 'center' });

  // Gold line
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(1);
  doc.line(margin + 20, 145, pageWidth - margin - 20, 145);

  // Subtitle
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(202, 138, 4);
  doc.text('School Management System', pageWidth / 2, 160, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Features Documentation', pageWidth / 2, 172, { align: 'center' });

  // Version and date
  doc.setFontSize(11);
  doc.text('Version 2.0', pageWidth / 2, 200, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 208, { align: 'center' });

  // Footer on cover
  doc.setFontSize(10);
  doc.text('Madyan Swat, Pakistan', pageWidth / 2, pageHeight - 30, { align: 'center' });
  doc.text('www.suffah.lovable.app', pageWidth / 2, pageHeight - 22, { align: 'center' });

  // ===== TABLE OF CONTENTS =====
  doc.addPage();
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', pageWidth / 2, 23, { align: 'center' });

  let tocY = 50;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);

  featureCategories.forEach((category, index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${category.title}`, margin, tocY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${index + 3}`, pageWidth - margin - 20, tocY);
    doc.setTextColor(0, 0, 0);
    tocY += 10;
  });

  // ===== FEATURE PAGES =====
  featureCategories.forEach((category, catIndex) => {
    doc.addPage();

    // Category header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(category.title, pageWidth / 2, 23, { align: 'center' });

    let yPos = 45;

    category.features.forEach((feature, featIndex) => {
      // Check if need new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        // Add header on new page
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`${category.title} (continued)`, pageWidth / 2, 23, { align: 'center' });
        yPos = 45;
      }

      // Feature box
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(...secondaryColor);
      doc.setLineWidth(0.5);
      const boxHeight = 8 + feature.highlights.length * 6 + 10;
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, boxHeight, 3, 3, 'FD');

      // Feature name
      doc.setTextColor(...primaryColor);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(feature.name, margin + 5, yPos + 7);

      // Feature description
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(feature.description, margin + 5, yPos + 14);

      // Highlights
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      feature.highlights.forEach((highlight, hIndex) => {
        const bulletY = yPos + 22 + hIndex * 6;
        doc.setFillColor(...goldColor);
        doc.circle(margin + 8, bulletY - 1.5, 1.5, 'F');
        doc.text(highlight, margin + 13, bulletY);
      });

      yPos += boxHeight + 8;
    });

    // Page number
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${catIndex + 3}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  });

  // ===== TECHNOLOGY STACK PAGE =====
  doc.addPage();
  
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('🛠️ Technology Stack', pageWidth / 2, 23, { align: 'center' });

  const techStack = [
    { category: 'Frontend', items: ['React 18', 'TypeScript', 'Tailwind CSS', 'Shadcn/UI Components'] },
    { category: 'Backend', items: ['Supabase (PostgreSQL)', 'Edge Functions', 'Row Level Security'] },
    { category: 'Authentication', items: ['Email/Password Auth', 'Role-based Access Control', 'Session Management'] },
    { category: 'Storage', items: ['Cloud File Storage', 'Secure Signed URLs', 'Image Optimization'] },
    { category: 'PDF Generation', items: ['jsPDF', 'jsPDF-AutoTable', 'QR Code Generation'] },
    { category: 'Notifications', items: ['Email (Resend)', 'SMS/WhatsApp (Twilio)', 'In-app Notifications'] },
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Category', 'Technologies']],
    body: techStack.map(t => [t.category, t.items.join(', ')]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // ===== CONTACT PAGE =====
  doc.addPage();
  
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Try to add logo
  try {
    const logoImg = await loadImage('/images/school-logo.png');
    doc.addImage(logoImg, 'PNG', pageWidth / 2 - 20, 40, 40, 40);
  } catch {
    // Skip logo if not available
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Contact Us', pageWidth / 2, 100, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const contactInfo = [
    '📍 Location: Madyan Swat, Pakistan',
    '🌐 Website: suffah.lovable.app',
    '📧 Email: contact@suffah.edu.pk',
    '📞 Phone: +92 XXX XXXXXXX',
  ];

  contactInfo.forEach((info, index) => {
    doc.text(info, pageWidth / 2, 120 + index * 12, { align: 'center' });
  });

  // Gold line
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(margin + 40, 175, pageWidth - margin - 40, 175);

  doc.setFontSize(14);
  doc.setTextColor(...goldColor);
  doc.text('"Excellence in Education"', pageWidth / 2, 195, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('© 2025 The Suffah Public School & College. All rights reserved.', pageWidth / 2, pageHeight - 20, { align: 'center' });

  return doc;
};

export const downloadProjectFeaturesPdf = async () => {
  const doc = await generateProjectFeaturesPdf();
  doc.save('Suffah-School-Management-System-Features.pdf');
};
