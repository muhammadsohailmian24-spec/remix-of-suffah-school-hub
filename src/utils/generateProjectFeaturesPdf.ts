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

interface ScreenshotSection {
  title: string;
  description: string;
  screenshotUrl?: string;
  features: string[];
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

// Screenshot URLs from the live application
const publicPageScreenshots: ScreenshotSection[] = [
  {
    title: 'Landing Page',
    description: 'The main entry point showcasing school identity, features, and quick access links.',
    features: [
      'Hero section with animated call-to-action buttons',
      'Statistics display: 500+ Students, 50+ Teachers, 20+ Classes, 15+ Years',
      'Feature highlights with icons and descriptions',
      'Dynamic photo gallery from database',
      'About section with school mission and values',
      'Responsive navigation with role-based login links'
    ]
  },
  {
    title: 'Online Admissions Portal',
    description: 'Public admission form for new student applications with photo upload.',
    features: [
      'Student personal information (name, DOB, gender)',
      'Photo upload with preview and validation',
      'Parent/guardian details with CNIC',
      'Previous school information',
      'Class selection dropdown',
      'Application tracking with unique ID'
    ]
  },
  {
    title: 'Staff Login Portal',
    description: 'Dedicated login page for teachers and administrators.',
    features: [
      'Email and password authentication',
      'Remember me functionality',
      'Session management with secure logout',
      'Role-based redirection after login',
      'Branded design with school identity'
    ]
  },
  {
    title: 'Student & Parent Login',
    description: 'Tabbed login interface for students and parents.',
    features: [
      'Students login with Student ID',
      'Parents login with Father\'s CNIC',
      'Separate tab interface for each role',
      'Remember me with local storage',
      'Secure password authentication'
    ]
  }
];

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
          'Unique Student ID generation (e.g., SUFFAH-2025-001)',
          'Class and section assignment with academic year tracking'
        ]
      },
      {
        name: 'Student ID Cards',
        description: 'Professional ID card generation with QR codes',
        highlights: [
          'Aesthetic vertical card design with royal blue theme',
          'QR code for attendance scanning',
          'School logo and student photo integration',
          'Individual and bulk download options',
          'Preview dialog before download'
        ]
      },
      {
        name: 'Student Portal',
        description: 'Dedicated portal for students to access their information',
        highlights: [
          'Personal dashboard with statistics',
          'View weekly timetable',
          'Access study materials by subject',
          'Check attendance records and percentage',
          'View exam results and download DMC'
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
          'Photo upload and management',
          'Salary and joining date records'
        ]
      },
      {
        name: 'Teacher ID Cards',
        description: 'Professional teacher ID cards with distinct green theme',
        highlights: [
          'Green and gold color scheme (different from student cards)',
          'QR code for attendance scanning',
          'Department and designation display',
          'Bulk generation for entire departments'
        ]
      },
      {
        name: 'Teacher Portal',
        description: 'Portal for teachers to manage their assigned classes',
        highlights: [
          'Mark student attendance (QR scanner or manual)',
          'Upload study materials with file type support',
          'Create and grade assignments',
          'Enter and publish exam results',
          'Generate award lists and roll number slips'
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
          'Multiple children support under single account',
          'Quick access to each child\'s data',
          'Download Detailed Marks Certificates (DMC)',
          'View attendance history with percentage'
        ]
      },
      {
        name: 'Fee Management',
        description: 'Track and manage children\'s fee payments',
        highlights: [
          'View pending and paid fees with due dates',
          'Download payment receipts and invoices',
          'Payment history with transaction details',
          'Fee due date notifications'
        ]
      },
      {
        name: 'Communication',
        description: 'Stay updated with school announcements',
        highlights: [
          'View school announcements by priority',
          'Notification preferences for SMS/Email',
          'Absence notifications for children',
          'Marks and result notifications'
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
          'Student enrollment statistics with charts',
          'Daily attendance summaries with percentage',
          'Fee collection analytics and trends',
          'Class-wise distribution bar charts',
          'Admission trend line charts'
        ]
      },
      {
        name: 'Quick Actions',
        description: 'Fast access to common administrative tasks',
        highlights: [
          'Pending admissions review count',
          'Today\'s absent students list',
          'Recent activity feed',
          'System notifications with unread badge'
        ]
      },
      {
        name: 'Global Search',
        description: 'Powerful search and reporting capabilities',
        highlights: [
          'Global student search dialog',
          'Search by name, ID, or class',
          'Quick navigation to student profiles',
          'Filter by class, section, status'
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
        description: 'Fast attendance marking using QR codes from ID cards',
        highlights: [
          'Camera-based QR scanning with Html5Qrcode',
          'Automatic late detection (configurable time)',
          'Manual ID entry fallback option',
          'Real-time attendance updates',
          'Audio feedback for scan success/failure'
        ]
      },
      {
        name: 'Attendance Reports',
        description: 'Detailed attendance tracking and reporting',
        highlights: [
          'Daily, weekly, monthly attendance reports',
          'Class-wise attendance summary with percentages',
          'Individual student attendance history',
          'PDF export with school branding',
          'Excel export for data analysis'
        ]
      },
      {
        name: 'Parent Notifications',
        description: 'Automatic alerts for absent students',
        highlights: [
          'Email notifications via Resend',
          'SMS/WhatsApp alerts via Twilio',
          'One-click "Notify All Parents" button',
          'Configurable notification settings'
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
          'Multiple fee types (tuition, transport, exam, etc.)',
          'Class-specific fee structures',
          'Recurring fee support (monthly, quarterly)',
          'Due date management per fee type'
        ]
      },
      {
        name: 'Payment Processing',
        description: 'Record and track all fee payments',
        highlights: [
          'Multiple payment methods (cash, bank, online)',
          'Discount and scholarship management',
          'Professional receipt generation with school branding',
          'Transaction ID and receipt number tracking'
        ]
      },
      {
        name: 'Fee Reports & Analytics',
        description: 'Comprehensive fee analytics and reports',
        highlights: [
          'Fee analytics dashboard with charts',
          'Class-wise collection reports',
          'Individual student fee invoices',
          'Pending dues tracking with defaulters list',
          'Export to PDF and Excel'
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
        description: 'Create and schedule exams with complete details',
        highlights: [
          'Multiple exam types (Term, Monthly, Weekly, Mid-term)',
          'Subject-wise exam scheduling',
          'Max marks and passing marks configuration',
          'Exam date and time slot management',
          'Academic year association'
        ]
      },
      {
        name: 'Result Entry',
        description: 'Streamlined marks entry system for teachers',
        highlights: [
          'Student-wise marks entry form',
          'Theory and practical marks support',
          'Automatic grade calculation (A+, A, B, etc.)',
          'Award list generation with rankings',
          'Bulk marks entry option'
        ]
      },
      {
        name: 'Certificates & Documents',
        description: 'Professional result documentation with school branding',
        highlights: [
          'Roll Number Slips (individual and bulk)',
          'Detailed Marks Certificates (DMC)',
          'Class-wise result sheets',
          'Marks in words conversion (e.g., "Eighty-Five")',
          'Preview before download'
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
        description: 'Weekly timetable configuration for each class',
        highlights: [
          'Day and period-wise scheduling',
          'Subject and teacher assignment per slot',
          'Room number allocation',
          'Dynamic time slot extraction',
          'Visual weekly grid display'
        ]
      },
      {
        name: 'Teacher Schedules',
        description: 'View teacher-specific timetables based on assignments',
        highlights: [
          'Weekly class schedule view',
          'Filtered by assigned subjects and classes',
          'Workload distribution visibility',
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
        description: 'School-wide announcement management system',
        highlights: [
          'Priority levels: Normal, Important, Urgent',
          'Target audience selection (all, students, teachers, parents)',
          'Publish/unpublish control',
          'Rich text content support',
          'Date-based display'
        ]
      },
      {
        name: 'Notifications',
        description: 'In-app real-time notification system',
        highlights: [
          'Real-time notification bell in header',
          'Unread count badge display',
          'Notification history list',
          'Link to relevant pages',
          'Mark as read functionality'
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
        description: 'Teachers can upload study resources for classes',
        highlights: [
          'Multiple file types support (PDF, DOC, PPT, images)',
          'Subject and class assignment',
          'Title and description fields',
          'Secure cloud file storage',
          'File type indicators'
        ]
      },
      {
        name: 'Student Access',
        description: 'Students can download materials for their class',
        highlights: [
          'Class-specific materials filter',
          'Secure signed URL downloads',
          'Organized by subject',
          'Search and filter options',
          'Download button with file info'
        ]
      }
    ]
  },
  {
    title: '🏫 Online Admissions',
    icon: '📝',
    features: [
      {
        name: 'Online Application',
        description: 'Public admission form for new student applications',
        highlights: [
          'Student details with photo upload',
          'Parent/guardian information with CNIC',
          'Previous school and class information',
          'Address and contact details',
          'Application submission with confirmation'
        ]
      },
      {
        name: 'Application Review',
        description: 'Admin review and approval workflow',
        highlights: [
          'Pending applications list with filters',
          'Approve/reject with review notes',
          'Auto student ID and login generation',
          'Status tracking for applicants',
          'Search and filter applications'
        ]
      },
      {
        name: 'Admission Form PDF',
        description: 'Generate complete admission forms for approved students',
        highlights: [
          'All student and parent details',
          'Student photo integration',
          'Login credentials section',
          'School terms and conditions',
          'Principal signature area'
        ]
      }
    ]
  },
  {
    title: '🖼️ Gallery Management',
    icon: '🎨',
    features: [
      {
        name: 'Image Management',
        description: 'Manage school gallery images displayed on landing page',
        highlights: [
          'Upload and organize images',
          'Description and display order',
          'Visibility on/off toggle',
          'Public display on landing page carousel',
          'Secure admin-only upload access'
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
  const lightBg: [number, number, number] = [245, 247, 250];

  let pageNumber = 1;

  const addPageNumber = () => {
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pageNumber++;
  };

  const addHeader = (title: string) => {
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 23, { align: 'center' });
  };

  // ===== COVER PAGE =====
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative elements
  doc.setFillColor(59, 130, 246);
  doc.circle(pageWidth - 30, 50, 60, 'F');
  doc.circle(30, pageHeight - 50, 40, 'F');
  doc.setFillColor(202, 138, 4);
  doc.circle(pageWidth - 60, pageHeight - 80, 20, 'F');

  // Try to add logo
  try {
    const logoImg = await loadImage('/images/school-logo.png');
    doc.addImage(logoImg, 'PNG', pageWidth / 2 - 25, 35, 50, 50);
  } catch {
    // Skip logo if not available
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah Public School', pageWidth / 2, 105, { align: 'center' });
  doc.text('& College', pageWidth / 2, 117, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', pageWidth / 2, 130, { align: 'center' });

  // Gold line
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(1.5);
  doc.line(margin + 30, 140, pageWidth - margin - 30, 140);

  // Subtitle
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(202, 138, 4);
  doc.text('School Management System', pageWidth / 2, 155, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Complete Features Documentation', pageWidth / 2, 167, { align: 'center' });

  // Key highlights box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 20, 180, pageWidth - margin * 2 - 40, 50, 5, 5, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const highlights = [
    '✓ Role-based portals (Admin, Teacher, Student, Parent)',
    '✓ Real-time attendance with QR scanner',
    '✓ Comprehensive fee management',
    '✓ Exam results & certificate generation',
    '✓ Online admissions with application tracking'
  ];
  highlights.forEach((h, i) => {
    doc.text(h, pageWidth / 2, 192 + i * 8, { align: 'center' });
  });

  // Version and date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Version 2.5', pageWidth / 2, 245, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 253, { align: 'center' });

  // Footer on cover
  doc.setFontSize(10);
  doc.text('Madyan Swat, Pakistan', pageWidth / 2, pageHeight - 25, { align: 'center' });
  doc.setTextColor(...goldColor);
  doc.text('suffah.lovable.app', pageWidth / 2, pageHeight - 17, { align: 'center' });

  // ===== TABLE OF CONTENTS =====
  doc.addPage();
  addHeader('📑 Table of Contents');

  let tocY = 50;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  // Section 1: Public Pages
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PUBLIC PAGES (with Screenshots)', margin, tocY);
  tocY += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  publicPageScreenshots.forEach((section, index) => {
    doc.text(`   ${index + 1}. ${section.title}`, margin, tocY);
    doc.text(`Page ${index + 3}`, pageWidth - margin - 20, tocY);
    tocY += 6;
  });

  tocY += 8;

  // Section 2: Feature Modules
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('FEATURE MODULES (Detailed Descriptions)', margin, tocY);
  tocY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  featureCategories.forEach((category, index) => {
    if (tocY > pageHeight - 30) {
      doc.addPage();
      addHeader('📑 Table of Contents (continued)');
      tocY = 50;
    }
    doc.text(`   ${index + 1}. ${category.title}`, margin, tocY);
    doc.text(`Page ${index + 7}`, pageWidth - margin - 20, tocY);
    tocY += 6;
  });

  tocY += 8;

  // Additional sections
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('ADDITIONAL INFORMATION', margin, tocY);
  tocY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('   • Technology Stack', margin, tocY);
  tocY += 6;
  doc.text('   • Contact Information', margin, tocY);

  addPageNumber();

  // ===== PUBLIC PAGES WITH SCREENSHOTS =====
  for (const section of publicPageScreenshots) {
    doc.addPage();
    addHeader(`📸 ${section.title}`);

    let yPos = 45;

    // Description box
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'FD');
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    const descLines = doc.splitTextToSize(section.description, pageWidth - margin * 2 - 10);
    doc.text(descLines, margin + 5, yPos + 8);

    yPos += 30;

    // Screenshot placeholder with wireframe
    doc.setFillColor(240, 242, 245);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 80, 3, 3, 'FD');

    // Wireframe content based on section
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (section.title === 'Landing Page') {
      // Navigation bar wireframe
      doc.setFillColor(30, 58, 138);
      doc.rect(margin + 2, yPos + 2, pageWidth - margin * 2 - 4, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('Logo | Features | Gallery | About | Admissions | Sign In | Get Started', margin + 5, yPos + 7);
      
      // Hero section
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Empowering Minds, Shaping Futures', pageWidth / 2, yPos + 25, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('[Hero Section with Animated Buttons]', pageWidth / 2, yPos + 32, { align: 'center' });
      
      // Stats boxes
      doc.setFillColor(220, 225, 230);
      const statBoxWidth = 35;
      const statsY = yPos + 40;
      for (let i = 0; i < 4; i++) {
        doc.roundedRect(margin + 10 + i * (statBoxWidth + 8), statsY, statBoxWidth, 15, 2, 2, 'F');
      }
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6);
      doc.text('500+', margin + 27, statsY + 6);
      doc.text('50+', margin + 27 + 43, statsY + 6);
      doc.text('20+', margin + 27 + 86, statsY + 6);
      doc.text('15+', margin + 27 + 129, statsY + 6);
      
      // Feature grid placeholder
      doc.setFontSize(8);
      doc.text('[Feature Cards Grid]', pageWidth / 2, yPos + 65, { align: 'center' });
      doc.text('[Gallery | About Section | Footer]', pageWidth / 2, yPos + 73, { align: 'center' });
    } else if (section.title === 'Online Admissions Portal') {
      // Form wireframe
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + 20, yPos + 10, pageWidth - margin * 2 - 40, 60, 3, 3, 'F');
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Admission Application Form', pageWidth / 2, yPos + 20, { align: 'center' });
      
      // Form fields placeholder
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('[Photo Upload] [Student Name] [Date of Birth] [Gender]', pageWidth / 2, yPos + 32, { align: 'center' });
      doc.text('[Father Name] [Father Phone] [Father CNIC]', pageWidth / 2, yPos + 40, { align: 'center' });
      doc.text('[Address] [Previous School] [Applying for Class]', pageWidth / 2, yPos + 48, { align: 'center' });
      
      doc.setFillColor(...goldColor);
      doc.roundedRect(pageWidth / 2 - 20, yPos + 55, 40, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Submit Application', pageWidth / 2, yPos + 62, { align: 'center' });
    } else if (section.title === 'Staff Login Portal') {
      // Two-column layout
      doc.setFillColor(30, 58, 138);
      doc.rect(margin + 2, yPos + 2, (pageWidth - margin * 2 - 4) / 2, 76, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Welcome to', margin + 45, yPos + 25);
      doc.text('The Suffah', margin + 45, yPos + 35);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('[School Logo & Branding]', margin + 45, yPos + 50);
      
      // Login form
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Staff Login', pageWidth / 2 + 35, yPos + 20);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('[Email Input]', pageWidth / 2 + 35, yPos + 35);
      doc.text('[Password Input]', pageWidth / 2 + 35, yPos + 45);
      doc.text('[Remember Me] [Sign In Button]', pageWidth / 2 + 35, yPos + 55);
    } else {
      // Student/Parent login with tabs
      doc.setFillColor(30, 58, 138);
      doc.rect(margin + 2, yPos + 2, (pageWidth - margin * 2 - 4) / 2, 76, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Portal Login', margin + 45, yPos + 35);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('[School Logo]', margin + 45, yPos + 50);
      
      // Tabbed login
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('[Student Tab] [Parent Tab]', pageWidth / 2 + 35, yPos + 20);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('[Student ID / Father CNIC]', pageWidth / 2 + 35, yPos + 35);
      doc.text('[Password Input]', pageWidth / 2 + 35, yPos + 45);
      doc.text('[Remember Me] [Sign In]', pageWidth / 2 + 35, yPos + 55);
    }

    yPos += 90;

    // Features list
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    const featuresBoxHeight = 10 + section.features.length * 7;
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, featuresBoxHeight, 3, 3, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Features:', margin + 5, yPos + 8);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    section.features.forEach((feature, index) => {
      const featureY = yPos + 16 + index * 7;
      doc.setFillColor(...goldColor);
      doc.circle(margin + 8, featureY - 1.5, 1.5, 'F');
      doc.text(feature, margin + 13, featureY);
    });

    addPageNumber();
  }

  // ===== FEATURE CATEGORY PAGES =====
  for (const category of featureCategories) {
    doc.addPage();
    addHeader(category.title);

    let yPos = 45;

    for (const feature of category.features) {
      // Check if need new page
      const boxHeight = 8 + feature.highlights.length * 6 + 12;
      if (yPos + boxHeight > pageHeight - 25) {
        addPageNumber();
        doc.addPage();
        addHeader(`${category.title} (continued)`);
        yPos = 45;
      }

      // Feature box
      doc.setFillColor(...lightBg);
      doc.setDrawColor(...secondaryColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, boxHeight, 3, 3, 'FD');

      // Feature name with icon
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`◆ ${feature.name}`, margin + 5, yPos + 7);

      // Feature description
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(feature.description, margin + 5, yPos + 14);

      // Highlights
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      feature.highlights.forEach((highlight, hIndex) => {
        const bulletY = yPos + 22 + hIndex * 6;
        doc.setFillColor(...goldColor);
        doc.circle(margin + 8, bulletY - 1.5, 1.5, 'F');
        doc.text(highlight, margin + 13, bulletY);
      });

      yPos += boxHeight + 6;
    }

    addPageNumber();
  }

  // ===== TECHNOLOGY STACK PAGE =====
  doc.addPage();
  addHeader('🛠️ Technology Stack');

  const techStack = [
    { category: 'Frontend Framework', items: ['React 18', 'TypeScript 5.x', 'Vite Build Tool'] },
    { category: 'UI & Styling', items: ['Tailwind CSS', 'Shadcn/UI Components', 'Lucide Icons', 'Framer Motion'] },
    { category: 'Backend Services', items: ['Lovable Cloud (PostgreSQL)', 'Edge Functions', 'Row Level Security (RLS)'] },
    { category: 'Authentication', items: ['Email/Password Auth', 'Role-based Access Control', 'Secure Session Management'] },
    { category: 'File Storage', items: ['Cloud File Storage', 'Secure Signed URLs', 'Image Upload & Optimization'] },
    { category: 'PDF Generation', items: ['jsPDF 4.0+', 'jsPDF-AutoTable', 'QRCode.js', 'JsBarcode'] },
    { category: 'Charts & Analytics', items: ['Recharts Library', 'Bar, Pie, Line Charts', 'Responsive Containers'] },
    { category: 'Notifications', items: ['Email via Resend API', 'SMS/WhatsApp via Twilio', 'In-app Real-time Notifications'] },
    { category: 'Data Export', items: ['PDF Reports', 'Excel (XLSX) Export', 'Bulk Operations Support'] },
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Category', 'Technologies']],
    body: techStack.map(t => [t.category, t.items.join(', ')]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' }
    }
  });

  // Key Security Features
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 50, 3, 3, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('🔒 Security Features', margin + 5, finalY + 10);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const securityFeatures = [
    '• Row Level Security (RLS) policies for data protection',
    '• Role-based access control (Admin, Teacher, Student, Parent)',
    '• Secure password hashing and session management',
    '• Signed URLs for file downloads (no direct public access)',
    '• API rate limiting and request validation'
  ];
  securityFeatures.forEach((sf, i) => {
    doc.text(sf, margin + 5, finalY + 20 + i * 6);
  });

  addPageNumber();

  // ===== CONTACT PAGE =====
  doc.addPage();
  
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative circles
  doc.setFillColor(59, 130, 246);
  doc.circle(pageWidth - 40, 60, 50, 'F');
  doc.setFillColor(202, 138, 4);
  doc.circle(40, pageHeight - 60, 30, 'F');

  // Try to add logo
  try {
    const logoImg = await loadImage('/images/school-logo.png');
    doc.addImage(logoImg, 'PNG', pageWidth / 2 - 25, 35, 50, 50);
  } catch {
    // Skip logo if not available
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Contact Us', pageWidth / 2, 105, { align: 'center' });

  // Contact info box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 20, 120, pageWidth - margin * 2 - 40, 70, 5, 5, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const contactInfo = [
    { icon: '📍', text: 'Location: Madyan Swat, Khyber Pakhtunkhwa, Pakistan' },
    { icon: '🌐', text: 'Website: suffah.lovable.app' },
    { icon: '📧', text: 'Email: contact@suffah.edu.pk' },
    { icon: '📞', text: 'Phone: +92 XXX XXXXXXX' },
    { icon: '⏰', text: 'Office Hours: Monday - Saturday, 8:00 AM - 3:00 PM' },
  ];

  contactInfo.forEach((info, index) => {
    doc.text(`${info.icon}  ${info.text}`, pageWidth / 2, 135 + index * 10, { align: 'center' });
  });

  // Gold line
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.line(margin + 40, 200, pageWidth - margin - 40, 200);

  // Motto
  doc.setFontSize(16);
  doc.setTextColor(...goldColor);
  doc.setFont('helvetica', 'italic');
  doc.text('"Excellence in Education"', pageWidth / 2, 220, { align: 'center' });

  // Additional info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PSRA Reg. No. 200445000302', pageWidth / 2, 240, { align: 'center' });
  doc.text('BISE Reg. No. 434-B/Swat-C', pageWidth / 2, 248, { align: 'center' });

  // Footer
  doc.setFontSize(9);
  doc.text('© 2025 The Suffah Public School & College. All rights reserved.', pageWidth / 2, pageHeight - 15, { align: 'center' });

  return doc;
};

export const downloadProjectFeaturesPdf = async () => {
  const doc = await generateProjectFeaturesPdf();
  doc.save('Suffah-School-Management-System-Features.pdf');
};

export const previewProjectFeaturesPdf = async (): Promise<string> => {
  const doc = await generateProjectFeaturesPdf();
  return doc.output('bloburl') as unknown as string;
};
