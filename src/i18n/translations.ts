import type { Language, LocalizedText, SectionKey } from '../types/birthday.ts';

export function pickText(text: LocalizedText | undefined, lang: Language): string {
  if (!text) return '';
  return text[lang] || text.en || text.ar || '';
}

export function pickChapterCopy(
  override: { kicker?: LocalizedText; title?: LocalizedText; subtitle?: LocalizedText } | undefined,
  defaults: { kicker: string; title: string; subtitle?: string },
  lang: Language,
) {
  return {
    kicker: (override?.kicker && pickText(override.kicker, lang)) || defaults.kicker,
    title: (override?.title && pickText(override.title, lang)) || defaults.title,
    subtitle: (override?.subtitle && pickText(override.subtitle, lang)) || defaults.subtitle || '',
  };
}

export interface UIStrings {
  nav: {
    celebration: string;
    memories: string;
    games: string;
    wishes: string;
    finale: string;
    studio: string;
  };
  hero: {
    editionLabel: string;
    turningAge: string;
    startExperience: string;
    startWithMusic: string;
    scrollHint: string;
  };
  stage3d: {
    kicker: string;
    title: string;
    subtitle: string;
    viewOverview: string;
    viewLanterns: string;
    viewPedestal: string;
    triggerFireworks: string;
    togglePetals: string;
    hideControls: string;
    showControls: string;
    dragHint: string;
    fallbackLabel: string;
  };
  cake: {
    kicker: string;
    title: string;
    subtitle: string;
    lightAll: string;
    blowCandles: string;
    relight: string;
    candlesLitCount: string;
    allLitHint: string;
    wishGranted: string;
    tapCandleHint: string;
  };
  gift: {
    kicker: string;
    title: string;
    subtitle: string;
    openGift: string;
    closeGift: string;
    fromLabel: string;
  };
  memories: {
    kicker: string;
    title: string;
    subtitle: string;
    allFilter: string;
    photosFilter: string;
    videosFilter: string;
    tabGallery: string;
    tabTimeline: string;
    allAlbums: string;
    playMemoryAudio: string;
    pauseMemoryAudio: string;
    openLightbox: string;
    close: string;
    prev: string;
    next: string;
    empty: string;
    timelineEmpty: string;
  };
  scratch: {
    kicker: string;
    title: string;
    subtitle: string;
    instruction: string;
    revealButton: string;
    resetButton: string;
    revealedLabel: string;
  };
  games: {
    kicker: string;
    title: string;
    subtitle: string;
    tabQuiz: string;
    tabGuess: string;
    tabPuzzle: string;
    tabWheel: string;
    quizQuestionOf: string;
    quizNext: string;
    quizRestart: string;
    quizScoreTitle: string;
    quizCorrect: string;
    quizIncorrect: string;
    guessShowHint: string;
    guessReveal: string;
    guessNext: string;
    puzzleShuffle: string;
    puzzlePreview: string;
    puzzleMoves: string;
    puzzleSolved: string;
    puzzleSelectHint: string;
    wheelSpin: string;
    wheelSpinning: string;
    wheelResultTitle: string;
  };
  messages: {
    kicker: string;
    title: string;
    subtitle: string;
    allTypes: string;
    letterType: string;
    audioType: string;
    videoType: string;
    photoType: string;
    catAll: string;
    catRomantic: string;
    catFriendship: string;
    catFamily: string;
  };
  wishTree: {
    kicker: string;
    title: string;
    subtitle: string;
    authorPlaceholder: string;
    messagePlaceholder: string;
    styleLeaf: string;
    styleStar: string;
    styleBlossom: string;
    submitWish: string;
    submitting: string;
    submittedApproved: string;
    submittedPending: string;
    wallTitle: string;
    emptyWall: string;
    submissionsClosed: string;
  };
  letter: {
    kicker: string;
    title: string;
    lockedTitle: string;
    unlockedTitle: string;
    opensOn: string;
    daysRemaining: string;
    openEnvelope: string;
    sealEnvelope: string;
    fromSender: string;
  };
  finale: {
    kicker: string;
    launchFireworks: string;
    replayJourney: string;
  };
  dock: {
    musicPlay: string;
    musicPause: string;
    mute: string;
    unmute: string;
    trackLabel: string;
    volumeLabel: string;
    languageLabel: string;
  };
  studio: {
    title: string;
    subtitle: string;
    close: string;
    passcodeLabel: string;
    claimTitle: string;
    claimDescription: string;
    unlockButton: string;
    claimButton: string;
    logout: string;
    saveChanges: string;
    saving: string;
    savedToast: string;
    uploadFile: string;
    uploading: string;
    recordVoice: string;
    stopRecording: string;
    copyShareLink: string;
    linkCopied: string;
    newEdition: string;
    editionTitlePlaceholder: string;
    createEdition: string;
    switchEdition: string;
  };
  magazine: {
    kicker: string;
    title: string;
    subtitle: string;
    openIssue: string;
    prevPage: string;
    nextPage: string;
    frontCover: string;
    backCover: string;
    spreadLabel: string;
    pageLabel: string;
    ofLabel: string;
    playSong: string;
    pauseSong: string;
    scanQr: string;
    swipeHint: string;
    collectorEdition: string;
    finishPrompt: string;
    unlockFeaturesBtn: string;
    flipToUnlockHint: string;
    quickContinue: string;
    remainingKicker: string;
    remainingTitle: string;
  };
  intro: {
    skipIntro: string;
    defaultLead: string;
    replayIntro: string;
  };
  envelope: {
    instruction: string;
    tapPrompt: string;
    skip: string;
    dear: string;
    birthdayWishTag: string;
    continueToCelebration: string;
    sealedWithLove: string;
  };
  sectionNames: Record<SectionKey, string>;
}

export const UI_STRINGS: Record<Language, UIStrings> = {
  en: {
    nav: {
      celebration: 'Celebration',
      memories: 'Memories',
      games: 'Games',
      wishes: 'Wishes',
      finale: 'Finale',
      studio: 'Owner Studio',
    },
    hero: {
      editionLabel: 'Private Keepsake Edition',
      turningAge: 'Celebrating Year',
      startExperience: 'Open Memory Book',
      startWithMusic: 'Open with Music',
      scrollHint: 'Scroll to turn the pages',
    },
    stage3d: {
      kicker: 'Chapter I · Celebration Stage',
      title: 'The Midnight Pavilion',
      subtitle: 'Orbit around the floating lanterns and golden keepsake stage prepared for tonight.',
      viewOverview: 'Overview',
      viewLanterns: 'Lanterns',
      viewPedestal: 'Pedestal',
      triggerFireworks: 'Fireworks',
      togglePetals: 'Rose Petals',
      hideControls: 'Hide Controls',
      showControls: 'Show Controls',
      dragHint: 'Drag to orbit · Scroll to zoom',
      fallbackLabel: 'Interactive 3D Pavilion',
    },
    cake: {
      kicker: 'Chapter II · The Birthday Wish',
      title: 'Light the Candles & Make a Wish',
      subtitle: 'Tap each candle to kindle its flame, close your eyes, and extinguish them together.',
      lightAll: 'Light All Candles',
      blowCandles: 'Make a Wish & Blow Out',
      relight: 'Relight Candles',
      candlesLitCount: 'candles lit',
      allLitHint: 'All candles are glowing — make your wish.',
      wishGranted: 'Your wish is sealed in starlight',
      tapCandleHint: 'Tap individual candles or use the button below',
    },
    gift: {
      kicker: 'Chapter III · Keepsake Parcel',
      title: 'A Parcel Tied in Champagne Silk',
      subtitle: 'Untie the ribbon and lift the velvet lid to reveal your surprise.',
      openGift: 'Open Gift Box',
      closeGift: 'Close Lid',
      fromLabel: 'Prepared with love by',
    },
    memories: {
      kicker: 'Chapter IV · Archival Scrapbook',
      title: 'Collected Moments',
      subtitle: 'Photographs, moving reels, and quiet soundtracks from chapters we treasure.',
      allFilter: 'All Moments',
      photosFilter: 'Photographs',
      videosFilter: 'Videos',
      tabGallery: 'Album Gallery',
      tabTimeline: 'Chronological Timeline',
      allAlbums: 'All Albums',
      playMemoryAudio: 'Play Memory Sound',
      pauseMemoryAudio: 'Pause Sound',
      openLightbox: 'Inspect Frame',
      close: 'Close',
      prev: 'Previous',
      next: 'Next',
      empty: 'No memories added in this filter yet.',
      timelineEmpty: 'No timeline milestones recorded yet.',
    },
    scratch: {
      kicker: 'Chapter V · Golden Foil Notes',
      title: 'Scratch to Reveal Hidden Surprises',
      subtitle: 'Rub the brushed champagne foil with your finger or cursor to uncover secret notes.',
      instruction: 'Drag across the foil surface',
      revealButton: 'Reveal Card',
      resetButton: 'Reset Foil',
      revealedLabel: 'Revealed Keepsake',
    },
    games: {
      kicker: 'Chapter VI · Salon of Games',
      title: 'Play & Remember',
      subtitle: 'Four bespoke keepsake games woven around our favorite shared stories.',
      tabQuiz: 'Birthday Quiz',
      tabGuess: 'Guess the Memory',
      tabPuzzle: 'Photo Puzzle',
      tabWheel: 'Lucky Wheel',
      quizQuestionOf: 'Question',
      quizNext: 'Next Question',
      quizRestart: 'Play Again',
      quizScoreTitle: 'Celebration Score',
      quizCorrect: 'Spot on!',
      quizIncorrect: 'Close — here is the story:',
      guessShowHint: 'Show Clue',
      guessReveal: 'Reveal Memory',
      guessNext: 'Next Challenge',
      puzzleShuffle: 'Shuffle Tiles',
      puzzlePreview: 'Hold to Preview',
      puzzleMoves: 'Moves',
      puzzleSolved: 'Memory Reassembled!',
      puzzleSelectHint: 'Click two tiles to swap them into place',
      wheelSpin: 'Spin the Wheel',
      wheelSpinning: 'Spinning...',
      wheelResultTitle: 'Tonight’s Reward',
    },
    messages: {
      kicker: 'Chapter VII · Voices & Letters',
      title: 'Notes From Those Who Adore You',
      subtitle: 'Written tributes, recorded voices, and video greetings collected in one place.',
      allTypes: 'All Notes',
      letterType: 'Letters',
      audioType: 'Voice Notes',
      videoType: 'Video Greetings',
      photoType: 'Photo Cards',
      catAll: 'All Circles',
      catRomantic: 'Romantic',
      catFriendship: 'Friendship',
      catFamily: 'Family',
    },
    wishTree: {
      kicker: 'Chapter VIII · The Wish Tree',
      title: 'Hang a Wish Upon the Branches',
      subtitle: 'Leave a blessing, star, or blossom for the year ahead.',
      authorPlaceholder: 'Your name',
      messagePlaceholder: 'Write a heartfelt birthday wish...',
      styleLeaf: 'Golden Leaf',
      styleStar: 'Starlight',
      styleBlossom: 'Rose Blossom',
      submitWish: 'Hang on the Tree',
      submitting: 'Hanging wish...',
      submittedApproved: 'Your wish now shines on the tree.',
      submittedPending: 'Thank you — your wish awaits owner approval.',
      wallTitle: 'Message Wall',
      emptyWall: 'Be the first to place a wish on the branches.',
      submissionsClosed: 'The wish book is currently closed to new entries.',
    },
    letter: {
      kicker: 'Chapter IX · Sealed Time Capsule',
      title: 'Letter to the Future',
      lockedTitle: 'Sealed Until the Appointed Day',
      unlockedTitle: 'The Seal May Be Broken',
      opensOn: 'Scheduled to open on',
      daysRemaining: 'days remaining until unsealing',
      openEnvelope: 'Break Wax Seal & Read',
      sealEnvelope: 'Fold & Reseal Letter',
      fromSender: 'Written by',
    },
    finale: {
      kicker: 'Epilogue · Midnight Toast',
      launchFireworks: 'Launch Celebration Fireworks',
      replayJourney: 'Return to Cover',
    },
    dock: {
      musicPlay: 'Play Music',
      musicPause: 'Pause Music',
      mute: 'Mute Audio',
      unmute: 'Unmute Audio',
      trackLabel: 'Soundtrack',
      volumeLabel: 'Volume',
      languageLabel: 'Language',
    },
    studio: {
      title: 'Owner Studio',
      subtitle: 'Customize every story, photo, audio track, and visual setting in this universal memory book.',
      close: 'Close Studio',
      passcodeLabel: 'Owner Passcode',
      claimTitle: 'Set Owner Passcode',
      claimDescription: 'Create a private passcode to protect editing and wish moderation for this memory book.',
      unlockButton: 'Unlock Studio',
      claimButton: 'Save Passcode & Enter',
      logout: 'Lock Studio',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      savedToast: 'All changes saved to the memory book.',
      uploadFile: 'Upload Media',
      uploading: 'Uploading...',
      recordVoice: 'Record Voice Note',
      stopRecording: 'Stop Recording',
      copyShareLink: 'Copy Share Link',
      linkCopied: 'Share link copied',
      newEdition: 'Create New Edition',
      editionTitlePlaceholder: 'e.g. Nadia’s 30th',
      createEdition: 'Create Edition',
      switchEdition: 'Active Edition',
    },
    magazine: {
      kicker: 'Collector’s Print Issue · Birthday Magazine',
      title: 'The Birthday Magazine',
      subtitle: 'Turn the printed pages of a bespoke collector’s issue crafted in your honor.',
      openIssue: 'Open Issue',
      prevPage: 'Previous Page',
      nextPage: 'Next Page',
      frontCover: 'Front Cover',
      backCover: 'Back Cover',
      spreadLabel: 'Spread',
      pageLabel: 'Page',
      ofLabel: 'of',
      playSong: 'Play Dedicated Song',
      pauseSong: 'Pause Song',
      scanQr: 'Scan Soundtrack QR',
      swipeHint: 'Drag pages, click left/right pages, or use arrow keys',
      collectorEdition: 'Collector’s Keepsake Edition',
      finishPrompt: 'You’ve reached the final cover — ready to step into the rest of your celebration?',
      unlockFeaturesBtn: 'Reveal Remaining Birthday Features',
      flipToUnlockHint: 'Turn through all pages to the back cover to unlock the rest of your birthday world',
      quickContinue: 'Skip ahead to the remaining celebration',
      remainingKicker: 'Chapter Finale · Your Full Birthday World',
      remainingTitle: 'Explore Every Celebration Surprise',
    },
    intro: {
      skipIntro: 'Skip Intro',
      defaultLead: 'HAPPY BIRTHDAY',
      replayIntro: 'Replay Intro',
    },
    envelope: {
      instruction: 'A special letter for you',
      tapPrompt: 'Click the wax seal to open',
      skip: 'Skip',
      dear: 'Dearest',
      birthdayWishTag: 'Happy Birthday',
      continueToCelebration: 'Enter the Celebration',
      sealedWithLove: 'Sealed with love for you',
    },
    sectionNames: {
      stage3d: '3D Celebration Stage',
      cake: 'Interactive Birthday Cake',
      gift: 'Interactive Gift Box',
      memories: 'Memory Album',
      magazine: 'Birthday Magazine',
      scratch: 'Scratch Cards',
      games: 'Interactive Games',
      messages: 'Messages & Voice Notes',
      wishtree: 'Wish Tree & Message Wall',
      letter: 'Letter to the Future',
      finale: 'Emotional Finale',
    },
  },
  ar: {
    nav: {
      celebration: 'الاحتفال',
      memories: 'الذكريات',
      games: 'الألعاب',
      wishes: 'الأمنيات',
      finale: 'الختام',
      studio: 'استوديو المالك',
    },
    hero: {
      editionLabel: 'إصدار تذكاري خاص',
      turningAge: 'نحتفي بالعام',
      startExperience: 'افتح كتاب الذكريات',
      startWithMusic: 'ابدأ مع الموسيقى',
      scrollHint: 'مرّر للأسفل لتقليب الصفحات',
    },
    stage3d: {
      kicker: 'الفصل الأول · منصة الاحتفال',
      title: 'جناح منتصف الليل',
      subtitle: 'تجوّل حول الفوانيس المضيئة ومنصة الاحتفال الذهبية المعدّة لهذه الليلة.',
      viewOverview: 'نظرة عامة',
      viewLanterns: 'الفوانيس',
      viewPedestal: 'المنصة',
      triggerFireworks: 'ألعاب نارية',
      togglePetals: 'بتلات الورد',
      hideControls: 'إخفاء الأزرار',
      showControls: 'إظهار الأزرار',
      dragHint: 'اسحب للتدوير · مرّر للتقريب',
      fallbackLabel: 'منصة احتفال ثلاثية الأبعاد',
    },
    cake: {
      kicker: 'الفصل الثاني · أمنية الميلاد',
      title: 'أشعل الشموع وتمنَّ أمنية',
      subtitle: 'اضغط على كل شمعة لإشعالها، ثم أغمض عينيك وأطفئها معاً.',
      lightAll: 'إشعال جميع الشموع',
      blowCandles: 'تمنَّ أمنية وأطفئ الشموع',
      relight: 'إعادة إشعال الشموع',
      candlesLitCount: 'شمعة مضاءة',
      allLitHint: 'جميع الشموع مضاءة الآن — تمنَّ أمنيتك.',
      wishGranted: 'حُفظت أمنيتك بين النجوم',
      tapCandleHint: 'اضغط على أي شمعة أو استخدم الزر أدناه',
    },
    gift: {
      kicker: 'الفصل الثالث · صندوق الهدية',
      title: 'هدية مربوطة بشريط الحرير الذهبي',
      subtitle: 'فكّ الشريط وارفع الغطاء المخملي لتكشف عن المفاجأة.',
      openGift: 'افتح صندوق الهدية',
      closeGift: 'إغلاق الصندوق',
      fromLabel: 'أُعدّت بكل حب من',
    },
    memories: {
      kicker: 'الفصل الرابع · ألبوم الذكريات',
      title: 'لحظات لا تُنسى',
      subtitle: 'صور ومقاطع فيديو وموسيقى هادئة من أجمل الفصول التي جمعتنا.',
      allFilter: 'كل الذكريات',
      photosFilter: 'الصور',
      videosFilter: 'الفيديو',
      tabGallery: 'معرض الصور',
      tabTimeline: 'الخط الزمني',
      allAlbums: 'كل الألبومات',
      playMemoryAudio: 'تشغيل صوت الذكرى',
      pauseMemoryAudio: 'إيقاف الصوت',
      openLightbox: 'عرض بالحجم الكامل',
      close: 'إغلاق',
      prev: 'السابق',
      next: 'التالي',
      empty: 'لا توجد ذكريات في هذا التصنيف حالياً.',
      timelineEmpty: 'لم يتم إضافة محطات في الخط الزمني بعد.',
    },
    scratch: {
      kicker: 'الفصل الخامس · بطاقات المفاجآت',
      title: 'امسح الطبقة الذهبية لاكتشاف المفاجأة',
      subtitle: 'حرّك إصبعك أو المؤشر فوق الرقاقة الذهبية لتظهر الرسائل الخفية.',
      instruction: 'امسح فوق البطاقة',
      revealButton: 'كشف البطاقة',
      resetButton: 'إعادة التغطية',
      revealedLabel: 'مفاجأة مكشوفة',
    },
    games: {
      kicker: 'الفصل السادس · ركن الألعاب',
      title: 'العب واستعد الذكريات',
      subtitle: 'أربع ألعاب تفاعلية مخصصة حول قصصنا ولحظاتنا المفضلة.',
      tabQuiz: 'اختبار الميلاد',
      tabGuess: 'خمن الذكرى',
      tabPuzzle: 'أحجية الصورة',
      tabWheel: 'عجلة الحظ',
      quizQuestionOf: 'سؤال',
      quizNext: 'السؤال التالي',
      quizRestart: 'العب مجدداً',
      quizScoreTitle: 'نتيجة الاحتفال',
      quizCorrect: 'إجابة صحيحة!',
      quizIncorrect: 'قريبة — إليك القصة:',
      guessShowHint: 'إظهار التلميح',
      guessReveal: 'كشف الإجابة',
      guessNext: 'التحدي التالي',
      puzzleShuffle: 'خلط القطع',
      puzzlePreview: 'اضغط مطولاً للمعاينة',
      puzzleMoves: 'الحركات',
      puzzleSolved: 'تم تجميع الذكرى بنجاح!',
      puzzleSelectHint: 'اضغط على قطعتين لتبديل مكانهما',
      wheelSpin: 'أدِر العجلة',
      wheelSpinning: 'جارٍ الدوران...',
      wheelResultTitle: 'مكافأة الليلة',
    },
    messages: {
      kicker: 'الفصل السابع · رسائل وأصوات',
      title: 'كلمات من قلوب تحبك',
      subtitle: 'رسائل مكتوبة وتسجيلات صوتية وتهاني مصوّرة في مكان واحد.',
      allTypes: 'كل الرسائل',
      letterType: 'رسائل',
      audioType: 'تسجيلات صوتية',
      videoType: 'تهاني فيديو',
      photoType: 'بطاقات صور',
      catAll: 'الكل',
      catRomantic: 'مشاعر خاصة',
      catFriendship: 'الصداقة',
      catFamily: 'العائلة',
    },
    wishTree: {
      kicker: 'الفصل الثامن · شجرة الأمنيات',
      title: 'علّق أمنيتك على الأغصان',
      subtitle: 'اترك دعوة جميلة أو نجمة أو زهرة تضيء العام القادم.',
      authorPlaceholder: 'اسمك',
      messagePlaceholder: 'اكتب أمنية عيد ميلاد صادقة...',
      styleLeaf: 'ورقة ذهبية',
      styleStar: 'نجمة مضيئة',
      styleBlossom: 'زهرة وردية',
      submitWish: 'علّق على الشجرة',
      submitting: 'جارٍ التعليق...',
      submittedApproved: 'أمنيتك تتلألأ الآن على الشجرة.',
      submittedPending: 'شكراً لك — أمنيتك بانتظار موافقة المالك.',
      wallTitle: 'جدار الرسائل',
      emptyWall: 'كن أول من يعلّق أمنية على هذه الشجرة.',
      submissionsClosed: 'إضافة الأمنيات الجديدة متوقفة حالياً.',
    },
    letter: {
      kicker: 'الفصل التاسع · كبسولة الزمن',
      title: 'رسالة إلى المستقبل',
      lockedTitle: 'مختومة حتى الموعد المحدد',
      unlockedTitle: 'حان وقت فضّ الختم',
      opensOn: 'تُفتح بتاريخ',
      daysRemaining: 'يوماً متبقياً حتى الفتح',
      openEnvelope: 'اكسر الختم الشمعي واقرأ',
      sealEnvelope: 'طي الرسالة وإعادة ختمها',
      fromSender: 'بقلم',
    },
    finale: {
      kicker: 'الخاتمة · نخب منتصف الليل',
      launchFireworks: 'إطلاق الألعاب النارية',
      replayJourney: 'العودة إلى الغلاف',
    },
    dock: {
      musicPlay: 'تشغيل الموسيقى',
      musicPause: 'إيقاف مؤقت',
      mute: 'كتم الصوت',
      unmute: 'إلغاء الكتم',
      trackLabel: 'الموسيقى',
      volumeLabel: 'مستوى الصوت',
      languageLabel: 'اللغة',
    },
    studio: {
      title: 'استوديو المالك',
      subtitle: 'خصّص كل قصة وصورة ومقطع صوتي وإعدادات بصرية في كتاب الذكريات الموحّد.',
      close: 'إغلاق الاستوديو',
      passcodeLabel: 'رمز دخول المالك',
      claimTitle: 'تعيين رمز دخول المالك',
      claimDescription: 'أنشئ رمزاً سرياً لحماية التعديل وإدارة الأمنيات في هذا الكتاب.',
      unlockButton: 'فتح الاستوديو',
      claimButton: 'حفظ الرمز والدخول',
      logout: 'قفل الاستوديو',
      saveChanges: 'حفظ التغييرات',
      saving: 'جارٍ الحفظ...',
      savedToast: 'تم حفظ جميع التغييرات بنجاح.',
      uploadFile: 'رفع ملف',
      uploading: 'جارٍ الرفع...',
      recordVoice: 'تسجيل رسالة صوتية',
      stopRecording: 'إيقاف التسجيل',
      copyShareLink: 'نسخ رابط المشاركة',
      linkCopied: 'تم نسخ الرابط',
      newEdition: 'إنشاء إصدار جديد',
      editionTitlePlaceholder: 'مثال: عيد ميلاد نادية',
      createEdition: 'إنشاء الإصدار',
      switchEdition: 'الإصدار النشط',
    },
    magazine: {
      kicker: 'إصدار خاص مطبوع · مجلة عيد الميلاد',
      title: 'مجلة عيد الميلاد',
      subtitle: 'تصفّحي صفحات هذه المجلة التذكارية الفاخرة المصممة خصيصاً للاحتفاء بكِ.',
      openIssue: 'فتح العدد',
      prevPage: 'الصفحة السابقة',
      nextPage: 'الصفحة التالية',
      frontCover: 'الغلاف الأمامي',
      backCover: 'الغلاف الخلفي',
      spreadLabel: 'مزدوج',
      pageLabel: 'صفحة',
      ofLabel: 'من',
      playSong: 'تشغيل الأغنية المهداه',
      pauseSong: 'إيقاف الأغنية',
      scanQr: 'امسح الرمز للاستماع',
      swipeHint: 'اسحب الصفحات أو اضغط عليها أو استخدم الأسهم للتقليب',
      collectorEdition: 'إصدار تذكاري خاص',
      finishPrompt: 'لقد وصلتِ إلى الغلاف الأخير — هل أنتِ مستعدة لاكتشاف بقية عالم الاحتفال؟',
      unlockFeaturesBtn: 'كشف بقية مفاجآت عيد الميلاد',
      flipToUnlockHint: 'تصفّح صفحات المجلة حتى الغلاف الخلفي لفتح بقية أقسام الموقع',
      quickContinue: 'تخطي إلى بقية المفاجآت',
      remainingKicker: 'تتمة الاحتفال · عالم عيد ميلادك الكامل',
      remainingTitle: 'اكتشفي جميع المفاجآت والأقسام',
    },
    intro: {
      skipIntro: 'تخطي المقدمة',
      defaultLead: 'عيد ميلاد سعيد',
      replayIntro: 'إعادة المقدمة',
    },
    envelope: {
      instruction: 'رسالة خاصة لكِ',
      tapPrompt: 'اضغط على الختم لفتح الرسالة',
      skip: 'تخطي',
      dear: 'عزيزتي',
      birthdayWishTag: 'عيد ميلاد سعيد',
      continueToCelebration: 'الدخول إلى الاحتفال',
      sealedWithLove: 'مختومة بكل حب',
    },
    sectionNames: {
      stage3d: 'منصة الاحتفال ثلاثية الأبعاد',
      cake: 'كعكة عيد الميلاد التفاعلية',
      gift: 'صندوق الهدية التفاعلي',
      memories: 'ألبوم الذكريات',
      magazine: 'مجلة عيد الميلاد',
      scratch: 'بطاقات المسح الذهبية',
      games: 'الألعاب التفاعلية',
      messages: 'الرسائل والتسجيلات',
      wishtree: 'شجرة الأمنيات وجدار الرسائل',
      letter: 'رسالة إلى المستقبل',
      finale: 'اللحظة الختامية',
    },
  },
};
