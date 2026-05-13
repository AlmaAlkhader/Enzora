import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {
  // Common
  appName: "Enzora",
  continue: "Continue",
  getStarted: "Get Started",
  cancel: "Cancel",
  save: "Save",
  skip: "Skip for now",
  loading: "Loading...",
  somethingWrong: "Something went wrong",
  tryAgain: "Try Again",
  optional: "Optional",
  gotIt: "Got it!",
  close: "Close",
  refresh: "Refresh",
  share: "Share",

  // Auth
  login: "Login",
  signUp: "Sign Up",
  email: "Email Address",
  password: "Password",
  confirmPassword: "Confirm Password",
  fullName: "Full Name",
  yourFullName: "Your full name",
  emailPlaceholder: "your@email.com",
  passwordPlaceholder: "Min. 8 characters",
  repeatPassword: "Repeat password",
  forgotPassword: "Forgot Password?",
  createAccount: "Create Account",
  signIn: "Sign In",
  unknownEmail:
    "We don't recognise this email. You need to create an account first. Tap Sign Up above!",
  invalidEmail: "Please enter a valid email address",
  passwordTooShort: "Password must be at least 8 characters",
  passwordsDontMatch: "Passwords don't match",
  required: "This field is required",
  authError: "Wrong email or password. Please try again.",
  emailInUse: "This email is already registered. Try logging in instead.",
  networkError:
    "Couldn't reach the server. Please check your internet connection and try again.",
  authNotEnabled:
    "Email sign-in isn't enabled for this app yet. Please contact support.",

  // Onboarding
  onboard1Title: "Monitor Your Wound Smartly",
  onboard1Sub:
    "Enzora's smart patch detects infection before it becomes a problem",
  onboard2Title: "Real-Time Color Detection",
  onboard2Sub:
    "Our sensor reads your bandage color and analyzes it instantly",
  onboard3Title: "Get Alerts Before It's Too Late",
  onboard3Sub:
    "You and your doctor get notified the moment something changes",

  // Medical profile
  medicalProfile: "Medical Profile",
  age: "Age",
  agePlaceholder: "Your age",
  gender: "Gender",
  male: "Male",
  female: "Female",
  other: "Other",
  preferNotToSay: "Prefer not to say",
  conditions: "Do you have any medical conditions?",
  conditionsPlaceholder: "e.g. Diabetes Type 2, Post-Surgery...",
  doctor: "Doctor",
  doctorName: "Doctor's name",
  doctorPhone: "Doctor's phone",
  emergencyContact: "Emergency Contact",
  emergencyName: "Contact name",
  emergencyPhone: "Contact phone",
  saveProfile: "Save Profile",

  // Tabs
  home: "Home",
  wounds: "Wounds",
  history: "History",
  alerts: "Alerts",
  profile: "Profile",

  // Home
  hello: "Hello",
  deviceConnected: "Device Connected",
  deviceNotConnected: "Device Not Connected",
  monitoring: "Monitoring",
  tapToConnect: "Tap to connect",
  deviceOfflineTitle: "Your Enzora device is not connected yet.",
  deviceOfflineSub:
    "Make sure the device is on and connected to WiFi.",
  howToConnect: "How to Connect?",
  woundNormal: "Wound is Normal",
  woundNormalSub:
    "Your wound shows no signs of infection. Keep it clean and dry.",
  earlySigns: "Early Signs Detected",
  earlySignsSub:
    "Early signs of possible infection. Monitor closely and contact your doctor soon.",
  infectionDetected: "Infection Detected",
  infectionDetectedSub:
    "Infection confirmed. Contact your doctor immediately.",
  lastReading: "Last Reading",
  todaysChecks: "Today's Checks",
  monitoringSince: "Monitoring Since",
  recentReadings: "Recent Readings",
  seeAll: "See All",
  noReadingsYet: "No readings yet",
  waitingForDevice: "Waiting for your device to send data",
  liveSensor: "Live Sensor",
  notConnected: "Not connected",
  careTips: "Care Tips for You ✨",

  // Wounds
  myWounds: "My Wounds",
  activeWounds: "active wound",
  activeWoundsPlural: "active wounds",
  addNewWound: "Add New Wound",
  noWoundsYet: "You haven't added any wounds yet",
  woundName: "Wound Name",
  woundNamePlaceholder: "My knee wound",
  whereWound: "Where is the wound?",
  whereWoundPlaceholder: "e.g. Left foot, right knee",
  whenHappened: "When did this happen?",
  howHappened: "How did it happen? (optional)",
  notes: "Any notes? (optional)",
  startMonitoring: "Start Monitoring This Wound",
  selectWoundTitle: "Which wound should we monitor?",
  newWoundOption: "This is a new wound",
  markHealed: "Mark as Healed",
  markHealedConfirm:
    "Wonderful news! Are you sure this wound has fully healed? It will move to your wound history.",
  yesHealed: "Yes, It's Healed",
  notYet: "Not Yet",
  addNote: "Add a Note",
  daysToHeal: "Took {{count}} days to heal",
  healed: "Healed",

  // History
  today: "Today",
  sevenDays: "7 Days",
  thirtyDays: "30 Days",
  normal: "Normal",
  caution: "Caution",
  alertLabel: "Alert",
  rgbTrend: "Color Trend",
  readingTimeline: "Reading Timeline",
  healedWounds: "Healed Wounds",
  yesterday: "Yesterday",
  earlier: "Earlier",
  noAlerts: "No alerts yet — your wound is being monitored",

  // Alert modal
  alertTitle: "Your Wound Needs Attention",
  alertBody:
    "Our sensor detected a possible infection. Please don't worry — here is what to do:",
  alertStep1: "Do NOT remove the bandage yourself",
  alertStep2: "Check if area is red, swollen, or warm",
  alertStep3: "Call your doctor as soon as possible",
  alertStep4: "If unwell, go to emergency room",
  callDoctor: "Call My Doctor Now",
  understand: "I Understand",
  callEmergencyNow: "Call Emergency Contact Now 🚨",

  // Connect help
  setupTitle: "How to Set Up Your Device",
  setupStep1Title: "Turn on your device",
  setupStep1:
    "Press the small button on its side. A light will turn on to show it is ready.",
  setupStep2Title: "Connect to WiFi",
  setupStep2:
    "Make sure your Enzora device is connected to your home WiFi network. The device connects automatically when it is turned on near your WiFi.",
  setupStep3Title: "Open the app",
  setupStep3:
    "Open this app and wait a few seconds. The app will connect automatically when the device is ready.",
  troubleshooting: "If not connecting:",
  trouble1: "Turn the device off and on again",
  trouble2: "Make sure your WiFi is working",
  trouble3: "Keep the device within range of your router",
  trouble4: "Contact your doctor if problem continues",
  callForHelp: "Call for Help",
  whatsappUs: "Message us on WhatsApp",

  // Device ID setup
  connectDeviceTitle: "Enter Your Device ID",
  connectDeviceHeading: "Enter Your Device ID",
  connectDeviceBody:
    "Look at the sticker on the back of your Enzora device and type the ID below.",
  deviceIdLabel: "Device ID",
  deviceIdPlaceholder: "e.g. ENZORA-001",
  deviceIdRequired: "Please enter your device ID.",
  connectDeviceButton: "Connect Device",
  deviceConnectedToast: "Device connected!",
  deviceNotFound:
    "We could not find this device. Please check the ID on the sticker and try again.",
  deviceNoFirebase:
    "We can't reach our servers right now. Please check your internet and try again.",
  currentlyConnected: "Currently connected",
  disconnectDevice: "Disconnect this device",

  // Simplified home additions
  connectToStart: "Connect your device to start monitoring",
  viewMyWounds: "View My Wounds",
  at: "at",
  back: "Back",
  whatsappPrefill: "Hi, I need help setting up my Enzora device",

  // Profile
  editProfile: "Edit Profile",
  settings: "Settings",
  language: "Language",
  notifications: "Notifications",
  largeText: "Large Text Mode",
  logout: "Logout",
  logoutConfirm: "Are you sure you want to log out?",
  noProfile: "No medical profile yet",
  completeProfile: "Complete your profile",
  dailyReminder: "Daily wellness reminder",
  biometricLogin: "Face ID / Fingerprint login",
  monitoringFor: "Monitoring for",
  addFamilyMember: "+ Add Family Member",
  whoMonitoring: "Who are you monitoring?",
  whoMonitoringPlaceholder: "e.g. My mother, Father...",
  relationship: "Relationship",
  myself: "Myself",
  mother: "Mother",
  father: "Father",
  spouse: "Spouse",
  child: "Child",
  theirConditions: "Their medical conditions",
  yourWellnessWeek: "Your wellness this week",
  noMoodsYet: "No mood check-ins yet — your week shows here",

  // Status long labels
  normalLabel: "Normal – No infection signs",
  cautionLabel: "Caution – Early infection signs",
  alertFullLabel: "Alert – Infection confirmed",

  // Healing journey
  healingJourney: "Healing Journey",
  dayOfMonitoring: "Day {{day}} of monitoring",
  dayLabel: "Day {{day}}",
  ofMonitoring: "of monitoring",
  healStageStart: "Just getting started 🌱",
  healStageProgress: "Good progress! Keep it up 💪",
  healStageAlmost: "Almost there! 🌟",
  healStageGreat: "Great dedication! 🎉",
  healMessageYellow: "Great progress! Keep it up 💪",
  healMessageGreen: "Stay careful – you're almost there",
  healMessageBlue: "Focus on recovery – contact your doctor",
  switchWound: "Switch Wound",

  // Color guide
  colorMeaningTitle: "What the colors mean 🎨",
  colorYellowTitle: "Yellow — Everything is fine",
  colorYellowBody:
    "Your wound is healing normally. Keep it clean and dry.",
  colorGreenTitle: "Green — Worth keeping an eye on",
  colorGreenBody:
    "The sensor noticed a small change. Nothing urgent, but please watch your wound and consider calling your doctor.",
  colorBlueTitle: "Blue — Please call your doctor",
  colorBlueBody:
    "The sensor detected a sign of infection. Please contact your doctor as soon as possible.",
  colorBannerGreen:
    "The sensor detected a color change in your bandage. This could be an early sign. Nothing to panic about — just keep an eye on it and contact your doctor if you are worried.",
  colorBannerBlue:
    "The sensor is showing a blue reading which may mean an infection has started. Please call your doctor today. If you feel unwell, go to the hospital.",
  dismiss: "Dismiss",
  colorGuide: "Color Guide 🎨",
  colorGuideIntro:
    "Your bandage sensor lights up in three colors. Here's what each one means and what to do.",
  colorGuideDisclaimer:
    "This guide is for general information. Always follow your doctor's advice.",
  onboardColorYellow: "Yellow = Normal",
  onboardColorYellowDesc: "Your wound is healing well.",
  onboardColorGreen: "Green = Watch closely",
  onboardColorGreenDesc: "An early sign — keep an eye on it.",
  onboardColorBlue: "Blue = Call your doctor",
  onboardColorBlueDesc: "Possible infection — contact your doctor.",

  // AI features
  aiAssessmentTitle: "AI Assessment",
  aiAnalyzing: "Analyzing your wound",
  aiUnavailable: "Assessment unavailable. Please try again later.",
  retry: "Retry",
  aiDisclaimer:
    "AI insights are for guidance only and do not replace medical advice.",
  aiPredictionTitle: "AI Prediction",
  aiAnalyzingHistory: "Analyzing your wound history",
  aiNotEnoughReadings:
    "Not enough readings yet for a prediction. Keep monitoring!",
  aiPredict: "Generate prediction",
  aiLastUpdated: "Last updated",
  trendImproving: "Getting Better 📈",
  trendStable: "Staying Stable ➡️",
  trendWorsening: "Needs Attention 📉",
  askEnzoraAI: "Ask Enzora AI",
  chatIntro: "Hi! Ask me anything about your wound or healing.",
  typeMessage: "Type your question…",
  chatChip1: "Is my wound getting better?",
  chatChip2: "What does green color mean?",
  chatChip3: "Should I change my bandage?",
  chatChip4: "When should I see a doctor?",
  chatChip5: "I have pain near my wound",

  // Confetti / celebration
  congratulations: "Congratulations!",
  healedSubtitle:
    "Your wound has fully healed. Great job taking care of yourself!",
  viewHealedWounds: "View Healed Wounds",

  // Daily reminder notification
  dailyReminderTitle: "Good morning from Enzora 💙",
  dailyReminderBody:
    "Your device is monitoring your wound. Stay hydrated and rest well today.",

  // Mood check-in
  moodTitle: "How are you feeling today?",
  moodGreat: "Great",
  moodOkay: "Okay",
  moodNotGreat: "Not great",
  moodPain: "In pain",
  moodResponseGreat: "That's wonderful! Keep it up 🌟",
  moodResponseOkay: "Take it easy today. You're doing great.",
  moodResponseNotGreat: "We're here for you. Rest well today 💙",
  moodResponsePain:
    "Please rest and contact your doctor if the pain is related to your wound.",

  // Doctor report
  doctorReport: "Generate Doctor Report 📋",
  doctorReportTitle: "Wound Status Report",
  reportSectionPatient: "Patient Information",
  reportSectionWound: "Wound Details",
  reportSectionSummary: "Monitoring Summary",
  reportSectionReadings: "Reading History",
  reportSectionAssessment: "Current Assessment",
  reportSectionRecs: "Recommendations",

  // Offline / online banners
  offlineBanner: "You're offline – showing last saved data",
  backOnlineBanner: "Back online – data updated ✓",

  // SOS
  sosLabel: "SOS",
  noEmergencyContact:
    "Please add an emergency contact in your profile first.",
  goToProfile: "Go to Profile",

  // Biometric login
  biometricEnableTitle: "Enable Face ID / Fingerprint login?",
  biometricEnableSubtitle:
    "Sign in faster next time without typing your password.",
  enable: "Enable",
  maybeLater: "Maybe later",
  usePasswordInstead: "Use password instead",
  biometricPromptMessage: "Sign in to Enzora",
};

const ar: typeof en = {
  appName: "إنزورا",
  continue: "متابعة",
  getStarted: "ابدأ الآن",
  cancel: "إلغاء",
  save: "حفظ",
  skip: "تخطي الآن",
  loading: "جارٍ التحميل...",
  somethingWrong: "حدث خطأ ما",
  tryAgain: "حاول مرة أخرى",
  optional: "اختياري",
  gotIt: "فهمت!",
  close: "إغلاق",
  refresh: "تحديث",
  share: "مشاركة",

  login: "تسجيل الدخول",
  signUp: "إنشاء حساب",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  confirmPassword: "تأكيد كلمة المرور",
  fullName: "الاسم الكامل",
  yourFullName: "اسمك الكامل",
  emailPlaceholder: "your@email.com",
  passwordPlaceholder: "8 أحرف على الأقل",
  repeatPassword: "أعد كلمة المرور",
  forgotPassword: "نسيت كلمة المرور؟",
  createAccount: "إنشاء الحساب",
  signIn: "تسجيل الدخول",
  unknownEmail:
    "لا نعرف هذا البريد الإلكتروني. يجب إنشاء حساب أولاً. اضغط على إنشاء حساب أعلاه!",
  invalidEmail: "يرجى إدخال بريد إلكتروني صحيح",
  passwordTooShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
  passwordsDontMatch: "كلمتا المرور غير متطابقتين",
  required: "هذا الحقل مطلوب",
  authError: "البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى.",
  emailInUse: "هذا البريد الإلكتروني مسجل بالفعل. حاول تسجيل الدخول.",
  networkError:
    "تعذر الوصول إلى الخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.",
  authNotEnabled:
    "تسجيل الدخول بالبريد الإلكتروني غير مفعّل في هذا التطبيق بعد. يرجى التواصل مع الدعم.",

  onboard1Title: "راقب جرحك بذكاء",
  onboard1Sub: "لاصقة إنزورا الذكية تكتشف العدوى قبل أن تصبح مشكلة",
  onboard2Title: "كشف الألوان في الوقت الفعلي",
  onboard2Sub: "يقرأ مستشعرنا لون الضمادة ويحللها فوراً",
  onboard3Title: "احصل على تنبيهات قبل فوات الأوان",
  onboard3Sub: "ستصلك أنت وطبيبك تنبيهات لحظة حدوث أي تغيير",

  medicalProfile: "الملف الطبي",
  age: "العمر",
  agePlaceholder: "عمرك",
  gender: "الجنس",
  male: "ذكر",
  female: "أنثى",
  other: "آخر",
  preferNotToSay: "أفضل عدم الإفصاح",
  conditions: "هل تعاني من حالات طبية؟",
  conditionsPlaceholder: "مثل: السكري، ما بعد الجراحة...",
  doctor: "الطبيب",
  doctorName: "اسم الطبيب",
  doctorPhone: "هاتف الطبيب",
  emergencyContact: "جهة اتصال للطوارئ",
  emergencyName: "اسم جهة الاتصال",
  emergencyPhone: "هاتف جهة الاتصال",
  saveProfile: "حفظ الملف",

  home: "الرئيسية",
  wounds: "جروحي",
  history: "السجل",
  alerts: "التنبيهات",
  profile: "الملف الشخصي",

  hello: "مرحباً",
  deviceConnected: "الجهاز متصل",
  deviceNotConnected: "الجهاز غير متصل",
  monitoring: "يراقب",
  tapToConnect: "اضغط للتوصيل",
  deviceOfflineTitle: "جهاز إنزورا غير متصل بعد.",
  deviceOfflineSub: "تأكد من تشغيل الجهاز واتصاله بالواي فاي.",
  howToConnect: "كيفية التوصيل؟",
  woundNormal: "الجرح طبيعي",
  woundNormalSub:
    "جرحك لا يظهر أي علامات عدوى. حافظ على نظافته وجفافه.",
  earlySigns: "تم اكتشاف علامات مبكرة",
  earlySignsSub:
    "علامات مبكرة لعدوى محتملة. راقب عن كثب واتصل بطبيبك قريباً.",
  infectionDetected: "تم اكتشاف عدوى",
  infectionDetectedSub: "تم تأكيد وجود عدوى. اتصل بطبيبك فوراً.",
  lastReading: "آخر قراءة",
  todaysChecks: "فحوصات اليوم",
  monitoringSince: "المراقبة منذ",
  recentReadings: "أحدث القراءات",
  seeAll: "عرض الكل",
  noReadingsYet: "لا توجد قراءات بعد",
  waitingForDevice: "في انتظار جهازك لإرسال البيانات",
  liveSensor: "مستشعر مباشر",
  notConnected: "غير متصل",
  careTips: "نصائح العناية لك ✨",

  myWounds: "جروحي",
  activeWounds: "جرح نشط",
  activeWoundsPlural: "جروح نشطة",
  addNewWound: "إضافة جرح جديد",
  noWoundsYet: "لم تقم بإضافة أي جروح بعد",
  woundName: "اسم الجرح",
  woundNamePlaceholder: "جرح ركبتي",
  whereWound: "أين الجرح؟",
  whereWoundPlaceholder: "مثل: القدم اليسرى، الركبة اليمنى",
  whenHappened: "متى حدث ذلك؟",
  howHappened: "كيف حدث؟ (اختياري)",
  notes: "أي ملاحظات؟ (اختياري)",
  startMonitoring: "بدء مراقبة هذا الجرح",
  selectWoundTitle: "أي جرح يجب أن نراقب؟",
  newWoundOption: "هذا جرح جديد",
  markHealed: "تحديد كشُفي",
  markHealedConfirm:
    "أخبار رائعة! هل أنت متأكد أن هذا الجرح قد شُفي تماماً؟ سينتقل إلى سجل الجروح.",
  yesHealed: "نعم، لقد شُفي",
  notYet: "ليس بعد",
  addNote: "إضافة ملاحظة",
  daysToHeal: "استغرق {{count}} يوماً للشفاء",
  healed: "شُفي",

  today: "اليوم",
  sevenDays: "7 أيام",
  thirtyDays: "30 يوماً",
  normal: "طبيعي",
  caution: "تحذير",
  alertLabel: "تنبيه",
  rgbTrend: "اتجاه الألوان",
  readingTimeline: "سجل القراءات",
  healedWounds: "الجروح الشافية",
  yesterday: "أمس",
  earlier: "سابقاً",
  noAlerts: "لا توجد تنبيهات بعد — جرحك تحت المراقبة",

  alertTitle: "جرحك يحتاج إلى عناية",
  alertBody: "اكتشف مستشعرنا عدوى محتملة. لا تقلق — إليك ما يجب فعله:",
  alertStep1: "لا تنزع الضمادة بنفسك",
  alertStep2: "تحقق إذا كانت المنطقة حمراء أو متورمة أو دافئة",
  alertStep3: "اتصل بطبيبك في أقرب وقت ممكن",
  alertStep4: "إذا شعرت بتوعك، اذهب إلى الطوارئ",
  callDoctor: "اتصل بطبيبي الآن",
  understand: "فهمت",
  callEmergencyNow: "اتصل بجهة الطوارئ الآن 🚨",

  setupTitle: "كيفية إعداد جهازك",
  setupStep1Title: "شغّل الجهاز",
  setupStep1:
    "اضغط الزر الصغير على جانبه. سيضيء ضوء يدل على جاهزيته.",
  setupStep2Title: "اتصل بالواي فاي",
  setupStep2:
    "تأكد من اتصال جهاز إنزورا بشبكة الواي فاي المنزلية. يتصل الجهاز تلقائياً عند تشغيله بالقرب من الواي فاي.",
  setupStep3Title: "افتح التطبيق",
  setupStep3:
    "افتح هذا التطبيق وانتظر بضع ثوانٍ. سيتصل التطبيق تلقائياً عند جاهزية الجهاز.",
  troubleshooting: "إذا لم يتصل:",
  trouble1: "أطفئ الجهاز ثم أعد تشغيله",
  trouble2: "تأكد من عمل الواي فاي",
  trouble3: "ابقِ الجهاز ضمن نطاق الراوتر",
  trouble4: "اتصل بطبيبك إذا استمرت المشكلة",
  callForHelp: "اتصل للمساعدة",
  whatsappUs: "راسلنا على واتساب",

  connectDeviceTitle: "أدخل رقم جهازك",
  connectDeviceHeading: "أدخل رقم جهازك",
  connectDeviceBody:
    "انظر إلى الملصق في خلف جهاز إنزورا وأدخل الرقم أدناه.",
  deviceIdLabel: "رقم الجهاز",
  deviceIdPlaceholder: "مثال: ENZORA-001",
  deviceIdRequired: "يرجى إدخال رقم جهازك.",
  connectDeviceButton: "توصيل الجهاز",
  deviceConnectedToast: "تم توصيل الجهاز!",
  deviceNotFound:
    "لم نتمكن من إيجاد هذا الجهاز. يرجى التحقق من الرقم على الملصق والمحاولة مرة أخرى.",
  deviceNoFirebase:
    "لا يمكننا الوصول إلى الخوادم الآن. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.",
  currentlyConnected: "متصل حالياً",
  disconnectDevice: "فصل هذا الجهاز",

  connectToStart: "وصّل جهازك لبدء المراقبة",
  viewMyWounds: "عرض جروحي",
  at: "في",
  back: "رجوع",
  whatsappPrefill: "مرحباً، أحتاج مساعدة في إعداد جهاز إنزورا",

  editProfile: "تعديل الملف",
  settings: "الإعدادات",
  language: "اللغة",
  notifications: "الإشعارات",
  largeText: "نص كبير",
  logout: "تسجيل الخروج",
  logoutConfirm: "هل أنت متأكد من تسجيل الخروج؟",
  noProfile: "لا يوجد ملف طبي بعد",
  completeProfile: "أكمل ملفك",
  dailyReminder: "تذكير يومي للعناية",
  biometricLogin: "تسجيل الدخول بالبصمة أو الوجه",
  monitoringFor: "أراقب من أجل",
  addFamilyMember: "+ أضف فرداً من العائلة",
  whoMonitoring: "من تراقب؟",
  whoMonitoringPlaceholder: "مثلاً: والدتي، والدي...",
  relationship: "صلة القرابة",
  myself: "نفسي",
  mother: "الأم",
  father: "الأب",
  spouse: "الزوج/الزوجة",
  child: "الطفل",
  theirConditions: "حالاتهم الطبية",
  yourWellnessWeek: "صحتك هذا الأسبوع",
  noMoodsYet: "لا توجد فحوصات مزاج بعد — يظهر أسبوعك هنا",

  normalLabel: "طبيعي – لا توجد علامات عدوى",
  cautionLabel: "تحذير – علامات عدوى مبكرة",
  alertFullLabel: "تنبيه – تم تأكيد العدوى",

  healingJourney: "رحلة الشفاء",
  dayOfMonitoring: "اليوم {{day}} من المراقبة",
  dayLabel: "اليوم {{day}}",
  ofMonitoring: "من المراقبة",
  healStageStart: "البداية للتو 🌱",
  healStageProgress: "تقدم جيد! واصل العناية 💪",
  healStageAlmost: "اقتربت! 🌟",
  healStageGreat: "إصرار رائع! 🎉",
  healMessageYellow: "تقدم رائع! واصل العناية 💪",
  healMessageGreen: "كن حذراً – أنت قريب من الشفاء",
  healMessageBlue: "ركز على التعافي – اتصل بطبيبك",
  switchWound: "تغيير الجرح",

  // Color guide
  colorMeaningTitle: "ماذا تعني الألوان 🎨",
  colorYellowTitle: "أصفر — كل شيء على ما يرام",
  colorYellowBody: "جرحك يلتئم بشكل طبيعي. حافظ عليه نظيفاً وجافاً.",
  colorGreenTitle: "أخضر — يستحق المتابعة",
  colorGreenBody:
    "لاحظ الجهاز تغيراً بسيطاً. لا شيء عاجلاً، لكن راقب جرحك وفكر في الاتصال بطبيبك.",
  colorBlueTitle: "أزرق — يرجى الاتصال بطبيبك",
  colorBlueBody:
    "اكتشف الجهاز علامة عدوى. يرجى التواصل مع طبيبك في أقرب وقت ممكن.",
  colorBannerGreen:
    "اكتشف الجهاز تغيراً في لون الضمادة. قد يكون هذا علامة مبكرة. لا داعي للقلق — فقط راقب جرحك وتواصل مع طبيبك إذا كنت قلقاً.",
  colorBannerBlue:
    "يُظهر الجهاز قراءة زرقاء قد تعني بدء عدوى. يرجى الاتصال بطبيبك اليوم. إذا كنت تشعر بتوعك، اذهب إلى المستشفى.",
  dismiss: "إغلاق",
  colorGuide: "دليل الألوان 🎨",
  colorGuideIntro:
    "يضيء جهاز الضمادة بثلاثة ألوان. إليك ما يعنيه كل لون وما الذي يجب فعله.",
  colorGuideDisclaimer:
    "هذا الدليل للمعلومات العامة. اتبع دائماً نصيحة طبيبك.",
  onboardColorYellow: "أصفر = طبيعي",
  onboardColorYellowDesc: "جرحك يلتئم جيداً.",
  onboardColorGreen: "أخضر = راقب عن كثب",
  onboardColorGreenDesc: "علامة مبكرة — راقب الجرح.",
  onboardColorBlue: "أزرق = اتصل بطبيبك",
  onboardColorBlueDesc: "عدوى محتملة — تواصل مع طبيبك.",

  // AI features
  aiAssessmentTitle: "تقييم الذكاء الاصطناعي",
  aiAnalyzing: "نحلّل جرحك",
  aiUnavailable: "التقييم غير متاح. يرجى المحاولة لاحقاً.",
  retry: "إعادة المحاولة",
  aiDisclaimer:
    "نصائح الذكاء الاصطناعي للإرشاد فقط ولا تحل محل استشارة الطبيب.",
  aiPredictionTitle: "توقع الذكاء الاصطناعي",
  aiAnalyzingHistory: "نحلّل سجل جرحك",
  aiNotEnoughReadings: "لا توجد قراءات كافية بعد للتوقع. تابع المتابعة!",
  aiPredict: "إنشاء توقع",
  aiLastUpdated: "آخر تحديث",
  trendImproving: "يتحسن 📈",
  trendStable: "مستقر ➡️",
  trendWorsening: "يحتاج إلى متابعة 📉",
  askEnzoraAI: "اسأل إنزورا الذكي",
  chatIntro: "مرحباً! اسألني أي شيء عن جرحك أو شفائك.",
  typeMessage: "اكتب سؤالك…",
  chatChip1: "هل جرحي يتحسن؟",
  chatChip2: "ماذا يعني اللون الأخضر؟",
  chatChip3: "هل يجب أن أغير ضمادتي؟",
  chatChip4: "متى يجب أن أزور الطبيب؟",
  chatChip5: "أشعر بألم قرب جرحي",

  congratulations: "مبروك!",
  healedSubtitle:
    "جرحك شُفي تماماً. أحسنت على اهتمامك بصحتك!",
  viewHealedWounds: "عرض الجروح الشافية",

  dailyReminderTitle: "صباح الخير من إنزورا 💙",
  dailyReminderBody:
    "جهازك يراقب جرحك. اشرب الماء واسترح جيداً اليوم.",

  moodTitle: "كيف تشعر اليوم؟",
  moodGreat: "رائع",
  moodOkay: "جيد",
  moodNotGreat: "لست بخير",
  moodPain: "أتألم",
  moodResponseGreat: "هذا رائع! واصل التقدم 🌟",
  moodResponseOkay: "خذ راحتك اليوم. أنت بخير.",
  moodResponseNotGreat: "نحن هنا لأجلك. استرح جيداً اليوم 💙",
  moodResponsePain:
    "يرجى الراحة والاتصال بطبيبك إذا كان الألم متعلقاً بجرحك.",

  doctorReport: "إنشاء تقرير للطبيب 📋",
  doctorReportTitle: "تقرير حالة الجرح",
  reportSectionPatient: "بيانات المريض",
  reportSectionWound: "تفاصيل الجرح",
  reportSectionSummary: "ملخص المراقبة",
  reportSectionReadings: "سجل القراءات",
  reportSectionAssessment: "التقييم الحالي",
  reportSectionRecs: "التوصيات",

  offlineBanner: "أنت غير متصل – تعرض آخر بيانات محفوظة",
  backOnlineBanner: "عدت للاتصال – تم تحديث البيانات ✓",

  sosLabel: "SOS",
  noEmergencyContact: "يرجى إضافة جهة اتصال للطوارئ في ملفك الشخصي أولاً.",
  goToProfile: "انتقل إلى الملف الشخصي",

  biometricEnableTitle: "تفعيل الدخول بالبصمة أو الوجه؟",
  biometricEnableSubtitle: "سجل الدخول أسرع في المرة القادمة بدون كتابة كلمة المرور.",
  enable: "تفعيل",
  maybeLater: "ربما لاحقاً",
  usePasswordInstead: "استخدم كلمة المرور بدلاً من ذلك",
  biometricPromptMessage: "سجل الدخول إلى إنزورا",
};

const STORAGE_KEY = "enzora.lang";

export async function loadLanguage(): Promise<"en" | "ar"> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export async function saveLanguage(lang: "en" | "ar"): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: "en",
  fallbackLng: "en",
  compatibilityJSON: "v4",
  interpolation: { escapeValue: false },
});

export default i18n;
