import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Edit3, Moon, Sun, Menu as MenuIcon, Plus, X, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3, Type, List, ListOrdered, Quote, Undo, Redo, Settings, Search, Download, ChevronDown, ChevronUp, Trash2, Check, Eye, EyeOff, Clock, Minus, Eraser, Info, Copy, Clipboard, FileText } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { playKeySound } from '../utils/keyboardAudio';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from '../utils/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

const formatClockTime = (date: Date) => {
  const hoursNum = date.getHours();
  const ampm = hoursNum >= 12 ? 'PM' : 'AM';
  const hours12 = hoursNum % 12 || 12;
  const hoursStr = String(hours12).padStart(2, '0');
  const minutesStr = String(date.getMinutes()).padStart(2, '0');
  const secondsStr = String(date.getSeconds()).padStart(2, '0');
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  
  return {
    hoursStr,
    minutesStr,
    secondsStr,
    ampm,
    dayStr,
    dateStr
  };
};

export type ThemeVariant = {
  bg: string;
  sidebarBg: string;
  text: string;
  activeNoteBg: string;
  activeNoteText: string;
  cardBg: string;
  cardText: string;
};

export type AppTheme = {
  id: string;
  name: string;
  light: ThemeVariant;
  dark: ThemeVariant;
};

const APP_THEMES: AppTheme[] = [
  {
    id: 'default',
    name: 'Standard',
    light: {
      bg: '#F5F5F7',
      sidebarBg: '#EFECE3',
      text: '#111111',
      cardBg: '#FFFFFF',
      cardText: '#111111',
      activeNoteBg: '#D4D4D8',
      activeNoteText: '#111111'
    },
    dark: {
      bg: '#0F0F11',
      sidebarBg: '#1A1A1E',
      text: '#F5F5F7',
      cardBg: '#1F1F24',
      cardText: '#F5F5F7',
      activeNoteBg: '#4B5563',
      activeNoteText: '#FFFFFF'
    }
  },
  {
    id: 'funky',
    name: 'Vintage Funky',
    light: {
      bg: '#F2EDDE',
      sidebarBg: '#EADECE',
      text: '#372517',
      cardBg: '#FFFFFF',
      cardText: '#372517',
      activeNoteBg: '#FFDE4D',
      activeNoteText: '#000000'
    },
    dark: {
      bg: '#1e1f29',
      sidebarBg: '#14151f',
      text: '#f8f8f2',
      cardBg: '#282a36',
      cardText: '#f8f8f2',
      activeNoteBg: '#ff79c6',
      activeNoteText: '#000000'
    }
  },
  {
    id: 'cyber',
    name: 'Cyber Retro',
    light: {
      bg: '#E0F7FA',
      sidebarBg: '#B2EBF2',
      text: '#006064',
      cardBg: '#FFFFFF',
      cardText: '#006064',
      activeNoteBg: '#FF4081',
      activeNoteText: '#FFFFFF'
    },
    dark: {
      bg: '#0D0E15',
      sidebarBg: '#151726',
      text: '#00FF9C',
      cardBg: '#1E2235',
      cardText: '#00E5FF',
      activeNoteBg: '#FF007F',
      activeNoteText: '#FFFFFF'
    }
  },
  {
    id: 'forest',
    name: 'Forest Moss',
    light: {
      bg: '#E8EFE9',
      sidebarBg: '#D1E0D4',
      text: '#1E2B22',
      cardBg: '#FAF7F2',
      cardText: '#1E2B22',
      activeNoteBg: '#A3BFA8',
      activeNoteText: '#1E2B22'
    },
    dark: {
      bg: '#0F1511',
      sidebarBg: '#151C17',
      text: '#E2ECE9',
      cardBg: '#1D2721',
      cardText: '#E2ECE9',
      activeNoteBg: '#5EA175',
      activeNoteText: '#FFFFFF'
    }
  },
  {
    id: 'velvet',
    name: 'Royal Velvet',
    light: {
      bg: '#F3E5F5',
      sidebarBg: '#E1BEE7',
      text: '#4A148C',
      cardBg: '#FFFFFF',
      cardText: '#4A148C',
      activeNoteBg: '#D500F9',
      activeNoteText: '#FFFFFF'
    },
    dark: {
      bg: '#0F091D',
      sidebarBg: '#19112E',
      text: '#E1D9F5',
      cardBg: '#231842',
      cardText: '#F1E6FF',
      activeNoteBg: '#8A2BE2',
      activeNoteText: '#FFFFFF'
    }
  }
];



export default function DigitalWindow() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [useLocalSession, setUseLocalSession] = useState(() => {
    return sessionStorage.getItem('digital_window_offline_session') === 'true';
  });
  const [firestoreNotesLoaded, setFirestoreNotesLoaded] = useState(false);
  const cloudSaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notesList, setNotesList] = useState<Note[]>(() => {
    const saved = localStorage.getItem('digital_window_all_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          // Real-time migration to remove duplicate 'welcome.' heading inside the body of existing welcome notes
          return parsed.map((note: Note) => {
            if (note.title.toLowerCase() === 'welcome' && note.content.startsWith('<h2>welcome.</h2>')) {
              return {
                ...note,
                content: note.content.replace('<h2>welcome.</h2>', '')
              };
            }
            return note;
          });
        }
      } catch (e) {
        // Fallback gracefully without throwing terminal logging errors
      }
    }
    
    const oldNotes = localStorage.getItem('digital_window_notes');
    if (oldNotes) {
      return [{ id: '1', title: '', content: oldNotes, updatedAt: Date.now() }];
    }
    return [{ 
      id: Date.now().toString(), 
      title: 'Welcome', 
      content: '<p>A calm, distraction-free environment designed to catch your thoughts, assemble your ideas, or simply write to the void.</p><p>Everything you compose here remains entirely local to your device—no cloud, no trackers, and no noise. Just you and the blinking cursor.</p><p><em>Where do we begin?</em></p>', 
      updatedAt: Date.now() 
    }];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string>(() => notesList[0]?.id || '');
  const activeNote = notesList.find(n => n.id === activeNoteId) || notesList[0] || {
    id: 'placeholder',
    title: 'UNTITLED',
    content: '',
    updatedAt: Date.now()
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'display' | 'themes' | 'cloud'>('display');
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('digital_window_theme') === 'dark');

  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    return localStorage.getItem('digital_window_theme_id') || 'default';
  });

  const activeTheme = APP_THEMES.find(t => t.id === selectedThemeId) || APP_THEMES[0];
  const themeModeSettings = isDarkMode ? activeTheme.dark : activeTheme.light;

  const [time, setTime] = useState(new Date());

  const [showClock, setShowClock] = useState(() => {
    const saved = localStorage.getItem('digital_window_show_clock');
    return saved !== 'false';
  });

  const [showStatusBar, setShowStatusBar] = useState(() => {
    const saved = localStorage.getItem('digital_window_show_status');
    return saved !== 'false';
  });

  const [fontPreference, setFontPreference] = useState<string>(() => {
    const saved = localStorage.getItem('digital_window_font');
    if (saved && ['sans', 'mono', 'serif'].includes(saved)) return saved;
    return 'sans';
  });

  const [confirmClearActive, setConfirmClearActive] = useState(false);

  useEffect(() => {
    if (confirmClearActive) {
      const timeout = setTimeout(() => {
        setConfirmClearActive(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [confirmClearActive]);

  useEffect(() => {
    if (!isSidebarOpen) {
      setIsSettingsExpanded(false);
    }
  }, [isSidebarOpen]);

  // Synchronize HTML/Body Background color and Theme Color Meta tag dynamically for native safe areas (notches/devices status bars)
  useEffect(() => {
    let activeBg = isDarkMode ? '#0F0F11' : '#F5F5F7';
    if (authLoading) {
      activeBg = isDarkMode ? '#0F0F11' : '#F4F4F5';
    } else if (user || useLocalSession) {
      activeBg = themeModeSettings.bg;
    }

    // Set fallback body/html styles to prevent screen flash or mismatched native bouncing borders
    document.documentElement.style.backgroundColor = activeBg;
    document.body.style.backgroundColor = activeBg;

    // Synchronize webapp theme-color meta tag for dynamic chrome integration on iOS/Android
    let metaTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'theme-color';
      document.getElementsByTagName('head')[0].appendChild(metaTag);
    }
    metaTag.content = activeBg;
  }, [authLoading, user, useLocalSession, isDarkMode, themeModeSettings.bg]);

  const [keySoundsEnabled, setKeySoundsEnabled] = useState(() => {
    const saved = localStorage.getItem('digital_window_key_sounds');
    return saved !== 'false';
  });

  const [keySoundProfile, setKeySoundProfile] = useState<'thocky' | 'mechanical'>(() => {
    const saved = localStorage.getItem('digital_window_key_sound_profile');
    return (saved || 'thocky') as 'thocky' | 'mechanical';
  });

  useEffect(() => {
    localStorage.setItem('digital_window_key_sounds', String(keySoundsEnabled));
    keySoundsEnabledRef.current = keySoundsEnabled;
    if (user) {
      saveConfigCloud({ keySoundsEnabled });
    }
  }, [keySoundsEnabled, user]);

  useEffect(() => {
    localStorage.setItem('digital_window_key_sound_profile', keySoundProfile);
    keySoundProfileRef.current = keySoundProfile;
    if (user) {
      saveConfigCloud({ keySoundProfile });
    }
  }, [keySoundProfile, user]);

  const keySoundsEnabledRef = React.useRef(keySoundsEnabled);
  const keySoundProfileRef = React.useRef(keySoundProfile);

  const userRef = React.useRef(user);
  const activeNoteIdRef = React.useRef(activeNoteId);
  const activeNoteRef = React.useRef(activeNote);

  useEffect(() => {
    userRef.current = user;
    activeNoteIdRef.current = activeNoteId;
    activeNoteRef.current = activeNote;
  }, [user, activeNoteId, activeNote]);

  const saveConfigCloud = async (updates: Record<string, any>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        ...updates,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    // Check if user is returning from a redirect auth flow
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setUser(result.user);
        }
      })
      .catch((err: any) => {
        console.error("Redirect sign-in error: ", err);
        let friendlyMessage = err?.message || String(err);
        if (err?.code === 'auth/unauthorized-domain') {
          friendlyMessage = `This domain is not listed as an Authorized Domain in your Firebase Console. Under Build -> Authentication -> Settings -> Authorized Domains, please add: ${window.location.hostname}`;
        }
        setAuthError(friendlyMessage);
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.themeId !== undefined && data.themeId !== selectedThemeId) {
          setSelectedThemeId(data.themeId);
        }
        if (data.isDarkMode !== undefined && data.isDarkMode !== isDarkMode) {
          setIsDarkMode(data.isDarkMode);
        }
        if (data.showClock !== undefined && data.showClock !== showClock) {
          setShowClock(data.showClock);
        }
        if (data.showStatusBar !== undefined && data.showStatusBar !== showStatusBar) {
          setShowStatusBar(data.showStatusBar);
        }
        if (data.fontPreference !== undefined && data.fontPreference !== fontPreference) {
          setFontPreference(data.fontPreference);
        }
        if (data.keySoundsEnabled !== undefined && data.keySoundsEnabled !== keySoundsEnabled) {
          setKeySoundsEnabled(data.keySoundsEnabled);
        }
        if (data.keySoundProfile !== undefined && data.keySoundProfile !== keySoundProfile) {
          setKeySoundProfile(data.keySoundProfile as any);
        }
        if (data.focusMode !== undefined && data.focusMode !== focusMode) {
          setFocusMode(data.focusMode);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFirestoreNotesLoaded(false);
      return;
    }

    const notesColRef = collection(db, 'users', user.uid, 'notes');
    const unsubscribe = onSnapshot(notesColRef, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const fetchedNotes: Note[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedNotes.push({
          id: docSnap.id,
          title: data.title || '',
          content: data.content || '',
          updatedAt: data.updatedAt || Date.now(),
        });
      });

      if (fetchedNotes.length > 0) {
        setNotesList(fetchedNotes);
        setFirestoreNotesLoaded(true);
      } else {
        setFirestoreNotesLoaded(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || !firestoreNotesLoaded) return;

    const migrateLocalToCloud = async () => {
      const local = localStorage.getItem('digital_window_all_notes');
      if (!local) return;
      try {
        const parsed: Note[] = JSON.parse(local);
        if (parsed && parsed.length > 0) {
          for (const note of parsed) {
            const existsInCloud = notesList.some(cn => cn.id === note.id);
            if (!existsInCloud) {
              const noteDocRef = doc(db, 'users', user.uid, 'notes', note.id);
              await setDoc(noteDocRef, {
                id: note.id,
                userId: user.uid,
                title: note.title,
                content: note.content,
                updatedAt: note.updatedAt
              });
            }
          }
        }
      } catch (err) {
        console.error("Cloud Migration Handshake Error: ", err);
      }
    };

    migrateLocalToCloud();
  }, [user, firestoreNotesLoaded]);

  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('digital_window_focus') === 'true';
  });

  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement>(null);

  const editorRelativeContainerRef = React.useRef<HTMLDivElement | null>(null);

  const getStats = () => {
    if (!activeNote || !activeNote.content) return { words: 0, chars: 0 };
    const rawText = activeNote.content.replace(/<[^>]+>/g, ' ').trim();
    const chars = rawText.length;
    const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    return { words, chars };
  };

  const getSelectionStats = () => {
    if (!editor || editor.isDestroyed) return { words: 0, chars: 0, hasSelection: false };
    const { from, to } = editor.state.selection;
    if (from === to) return { words: 0, chars: 0, hasSelection: false };
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const chars = selectedText.length;
    const words = selectedText.trim() ? selectedText.trim().split(/\s+/).filter(Boolean).length : 0;
    return { words, chars, hasSelection: chars > 0 };
  };

  const transformSelectedText = (mode: 'upper' | 'lower' | 'title' | 'sentence') => {
    if (!editor || editor.isDestroyed) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    let result = selectedText;
    if (mode === 'upper') {
      result = selectedText.toUpperCase();
    } else if (mode === 'lower') {
      result = selectedText.toLowerCase();
    } else if (mode === 'title') {
      result = selectedText.replace(/\b\w/g, c => c.toUpperCase());
    } else if (mode === 'sentence') {
      if (selectedText.length > 0) {
        result = selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
      }
    }
    editor.chain().focus().insertContent(result).run();
    setContextMenu(null);
  };

  const insertTimestamp = () => {
    if (!editor || editor.isDestroyed) return;
    const rawDate = new Date();
    const year = rawDate.getFullYear();
    const month = String(rawDate.getMonth() + 1).padStart(2, '0');
    const day = String(rawDate.getDate()).padStart(2, '0');
    const hours = String(rawDate.getHours()).padStart(2, '0');
    const minutes = String(rawDate.getMinutes()).padStart(2, '0');
    const timestamp = `[${year}-${month}-${day} ${hours}:${minutes}] `;
    
    editor.chain().focus().insertContent(timestamp).run();
    setContextMenu(null);
  };

  const insertHorizontalLine = () => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus().setHorizontalRule().run();
    setContextMenu(null);
  };

  const toggleBlockquote = () => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus().toggleBlockquote().run();
    setContextMenu(null);
  };

  const clearFormatting = () => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
    setContextMenu(null);
  };

  const removeAllTimestampsInNote = () => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    const cleanedHtml = currentHtml.replace(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\]\s?/g, '');
    editor.commands.setContent(cleanedHtml);
    setContextMenu(null);
  };

  const removeAllHorizontalLinesInNote = () => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    const cleanedHtml = currentHtml.replace(/<hr\s*\/?>/g, '');
    editor.commands.setContent(cleanedHtml);
    setContextMenu(null);
  };

  const deleteCurrentBlockOrSelection = () => {
    if (!editor || editor.isDestroyed) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      editor.chain().focus().selectParentNode().deleteSelection().run();
    } else {
      editor.chain().focus().deleteSelection().run();
    }
    setContextMenu(null);
  };

  const clearActiveNoteContent = () => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent('');
    setConfirmClearActive(false);
    setContextMenu(null);
  };

  const getNotePreviewText = (htmlContent: string) => {
    if (!htmlContent) return '...';
    // Replace closing block tags with spaces to avoid word merging
    let text = htmlContent.replace(/<\/(p|h1|h2|h3|h4|h5|h6|div|li|pre|blockquote|ol|ul)>/g, ' ');
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Replace HTML entity spaces
    text = text.replace(/&nbsp;/g, ' ');
    // Collapse whitespace characters (spaces, newlines, etc.) to a single space
    text = text.replace(/\s+/g, ' ').trim();
    return text || '...';
  };

  const convertHtmlToPlaintext = (html: string) => {
    if (!html) return '';
    let text = html;
    // Replace breaks with newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Replace paragraph/list/block elements with newlines
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/blockquote>/gi, '\n\n');
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Replace HTML entity spaces and references
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
    
    return text.trim();
  };

  const exportNoteAsTxt = () => {
    if (!activeNote) return;
    const title = activeNote.title.trim() || 'UNTITLED';
    const bodyText = convertHtmlToPlaintext(activeNote.content);
    const fileContent = bodyText;
    
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'note'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const { words, chars } = getStats();

  const sortedNotes = [...notesList].sort((a, b) => b.updatedAt - a.updatedAt);
  const filteredNotes = sortedNotes.filter(note => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const titleMatch = (note.title || 'UNTITLED').toLowerCase().includes(query);
    const contentText = getNotePreviewText(note.content).toLowerCase();
    const contentMatch = contentText.includes(query);
    return titleMatch || contentMatch;
  });

  const hoverRef = React.useRef(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Underline.configure({}),
      Placeholder.configure({
        placeholder: 'dump your thoughts here...',
      }),
    ],
    content: activeNote.content,
    onUpdate: ({ editor }) => {
      // Need to extract plain text for the sidebar preview, but save HTML as the active note content
      // Let's just save HTML as content, we will use a small helper to strip tags for the sidebar
      updateActiveNote({ content: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: `tiptap w-full min-h-[50vh] bg-transparent border-0 px-4 sm:px-12 md:px-20 lg:px-32 xl:px-48 text-xl sm:text-2xl md:text-3xl font-mono leading-relaxed placeholder:opacity-30 focus:ring-0 focus:outline-none z-10 relative overflow-hidden text-inherit`,
        spellcheck: "true",
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          if (keySoundsEnabledRef.current) {
            playKeySound(event.key, keySoundProfileRef.current);
          }
          return false;
        }
      }
    },
  });

  // Keep editor content in sync when switching notes
  useEffect(() => {
    if (editor && !editor.isDestroyed && activeNote.content !== editor.getHTML()) {
      editor.commands.setContent(activeNote.content);
    }
  }, [activeNoteId, editor]);

  // Automatically clean up untitled or unfilled notes that are not active anymore
  useEffect(() => {
    const hasEmptyInactive = notesList.some(note => 
      note.id !== activeNoteId && 
      !note.title.trim() && 
      (!note.content || getNotePreviewText(note.content) === '...' || !getNotePreviewText(note.content).trim())
    );

    if (hasEmptyInactive) {
      setNotesList(prev => prev.filter(note => 
        note.id === activeNoteId || 
        note.title.trim() || 
        (note.content && getNotePreviewText(note.content) !== '...' && getNotePreviewText(note.content).trim())
      ));
    }
  }, [activeNoteId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sidebar-container') && !target.closest('.menu-btn')) {
        setIsSidebarPinned(false);
      }
    };
    if (isSidebarPinned) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isSidebarPinned]);

  const handleMouseEnter = (delay: number | React.MouseEvent = 400) => {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return;
    }
    const delayMs = typeof delay === 'number' ? delay : 400;
    hoverRef.current = true;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (hoverRef.current) {
        setIsSidebarHovered(true);
      }
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return;
    }
    hoverRef.current = false;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setTimeout(() => {
      if (!hoverRef.current) {
        setIsSidebarHovered(false);
      }
    }, 150);
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    localStorage.setItem('digital_window_all_notes', JSON.stringify(notesList));
    setSaveStatus('saving');
    
    const savingTimer = setTimeout(() => {
      setSaveStatus('saved');
      
      const finishedTimer = setTimeout(() => {
        setSaveStatus('idle');
      }, 1000);
      
      return () => {
        clearTimeout(finishedTimer);
      };
    }, 600);
    
    return () => {
      clearTimeout(savingTimer);
    };
  }, [notesList]);

  useEffect(() => {
    localStorage.setItem('digital_window_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (user) {
      saveConfigCloud({ isDarkMode });
    }
  }, [isDarkMode, user]);

  useEffect(() => {
    localStorage.setItem('digital_window_theme_id', selectedThemeId);
    if (user) {
      saveConfigCloud({ themeId: selectedThemeId });
    }
  }, [selectedThemeId, user]);



  useEffect(() => {
    localStorage.setItem('digital_window_show_clock', String(showClock));
    if (user) {
      saveConfigCloud({ showClock });
    }
  }, [showClock, user]);

  useEffect(() => {
    localStorage.setItem('digital_window_show_status', String(showStatusBar));
    if (user) {
      saveConfigCloud({ showStatusBar });
    }
  }, [showStatusBar, user]);

  useEffect(() => {
    localStorage.setItem('digital_window_font', fontPreference);
    if (user) {
      saveConfigCloud({ fontPreference });
    }
  }, [fontPreference, user]);

  useEffect(() => {
    localStorage.setItem('digital_window_focus', String(focusMode));
    if (user) {
      saveConfigCloud({ focusMode });
    }
  }, [focusMode, user]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const createNewNote = React.useCallback(() => {
    const newNote = { id: Date.now().toString(), title: '', content: '', updatedAt: Date.now() };
    setNotesList(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);

    const usr = userRef.current;
    if (usr) {
      const noteDocRef = doc(db, 'users', usr.uid, 'notes', newNote.id);
      setDoc(noteDocRef, {
        id: newNote.id,
        userId: usr.uid,
        title: newNote.title,
        content: newNote.content,
        updatedAt: newNote.updatedAt
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${usr.uid}/notes/${newNote.id}`));
    }
  }, []);

  const deleteNoteById = React.useCallback((id: string) => {
    let emptyCreatedId: string | null = null;
    const usr = userRef.current;
    const actId = activeNoteIdRef.current;

    setNotesList(prev => {
      if (prev.length === 1) {
        const newNote = { id: Date.now().toString(), title: '', content: '', updatedAt: Date.now() };
        emptyCreatedId = newNote.id;
        setActiveNoteId(newNote.id);
        return [newNote];
      } else {
        const newList = prev.filter(n => n.id !== id);
        if (actId === id) {
          const nextActive = newList[0] || prev[0];
          if (nextActive) setActiveNoteId(nextActive.id);
        }
        return newList;
      }
    });

    if (usr) {
      const noteDocRef = doc(db, 'users', usr.uid, 'notes', id);
      deleteDoc(noteDocRef).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${usr.uid}/notes/${id}`));

      if (emptyCreatedId) {
        const newEmptyRef = doc(db, 'users', usr.uid, 'notes', emptyCreatedId);
        setDoc(newEmptyRef, {
          id: emptyCreatedId,
          userId: usr.uid,
          title: '',
          content: '',
          updatedAt: Date.now()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${usr.uid}/notes/${emptyCreatedId}`));
      }
    }
  }, []);

  const updateActiveNote = (updates: Partial<Note>) => {
    const actId = activeNoteIdRef.current;
    const usr = userRef.current;
    const nowStamp = Date.now();

    setNotesList(prev => 
      prev.map(n => 
        n.id === actId 
          ? { ...n, ...updates, updatedAt: nowStamp } 
          : n
      )
    );

    if (usr && actId) {
      setSaveStatus('saving');
      if (cloudSaveTimeoutRef.current) clearTimeout(cloudSaveTimeoutRef.current);
      cloudSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const actNote = activeNoteRef.current;
          const noteDocRef = doc(db, 'users', usr.uid, 'notes', actId);
          await setDoc(noteDocRef, {
            id: actId,
            userId: usr.uid,
            title: updates.title !== undefined ? updates.title : actNote?.title || '',
            content: updates.content !== undefined ? updates.content : actNote?.content || '',
            updatedAt: nowStamp
          }, { merge: true });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 1000);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${usr.uid}/notes/${actId}`);
        }
      }, 1500);
    }
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNoteToDelete(id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      
      // Cmd/Ctrl + N -> Create new note
      if (isMeta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewNote();
      }
      
      // Cmd/Ctrl + B -> Toggle sidebar pin
      if (isMeta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarPinned(prev => !prev);
      }
      
      // Cmd/Ctrl + F -> Focus search
      if (isMeta && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSidebarPinned(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 80);
      }
      
      // Cmd/Ctrl + D -> Toggle Dark Mode
      if (isMeta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDarkMode(prev => !prev);
      }
      
      // Cmd/Ctrl + / -> Toggle distraction-free focus mode
      if (isMeta && e.key === '/') {
        e.preventDefault();
        setFocusMode(prev => !prev);
      }
      
      // Cmd/Ctrl + S -> Manual save trigger feedback (peace of mind)
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSaveStatus('saving');
        const t = setTimeout(() => {
          setSaveStatus('saved');
          const t2 = setTimeout(() => setSaveStatus('idle'), 1000);
          return () => clearTimeout(t2);
        }, 300);
      }

      // Cmd/Ctrl + Shift + Backspace -> Delete current active note
      if (isMeta && e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        if (activeNoteId) {
          setNoteToDelete(activeNoteId);
        }
      }

      // Cmd/Ctrl + Shift + C -> Toggle Clock
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowClock(prev => !prev);
      }

      // Cmd/Ctrl + Shift + S -> Toggle Stats Panel
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowStatusBar(prev => !prev);
      }
      
      // Escape -> Turn off distraction-free focus mode if on, or clear search
      if (e.key === 'Escape') {
        if (focusMode) {
          setFocusMode(false);
        } else if (searchQuery) {
          setSearchQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [createNewNote, deleteNoteById, activeNoteId, focusMode, searchQuery]);

  useEffect(() => {
    const handleCloseMenu = (e: MouseEvent) => {
      // Check if contextMenuRef exists and if the click was inside the context menu itself,
      // in which case we don't close here, we let the button's onClick take priority first
      if (contextMenuRef.current?.contains(e.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleCloseMenu);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.shiftKey) return;

    const target = e.target as HTMLElement;
    
    // Allow default right-click inside the search input or buttons not related to editor components
    const isSearchInputOrSidebarButton = target.closest('input') && !target.closest('.title-input-field') && !target.classList.contains('tiptap') && !target.closest('.tiptap');
    if (isSearchInputOrSidebarButton) {
      return;
    }

    e.preventDefault();
    e.stopPropagation(); // Avoid triggering window's contextmenu immediately

    const menuWidth = 260;
    const menuHeight = 620;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({ x, y, visible: true });
  };

  const handleSignInPopup = async () => {
    if (keySoundsEnabled) playKeySound('Enter', keySoundProfile);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign-in failed (Popup): ", err);
      let friendlyMessage = err?.message || String(err);
      if (err?.code === 'auth/popup-blocked') {
        friendlyMessage = 'The Google login popup was blocked by your browser/device. Try using the Redirect method below, or allow popups.';
      } else if (err?.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'This domain is not listed as an Authorized Domain in your Firebase Console. Under Build -> Authentication -> Settings -> Authorized Domains, please add: ' + window.location.hostname;
      } else if (err?.code === 'auth/internal-error') {
        friendlyMessage = 'Firebase Auth Internal Error. This often means network issues or blocklists in your browser environment. Try the Redirect method.';
      } else if (window.self !== window.top) {
        friendlyMessage = 'Google Sign-In popups are heavily blocked inside iframe previews by modern browsers. Please use the Redirect method, or open the app in a new tab first.';
      }
      setAuthError(friendlyMessage);
    }
  };

  const handleSignInRedirect = async () => {
    if (keySoundsEnabled) playKeySound('Enter', keySoundProfile);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign-in failed (Redirect): ", err);
      let friendlyMessage = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'This domain is not listed as an Authorized Domain in your Firebase Console. Under Build -> Authentication -> Settings -> Authorized Domains, please add: ' + window.location.hostname;
      }
      setAuthError(friendlyMessage);
    }
  };

  const handleSignOut = async () => {
    if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
    try {
      await signOut(auth);
      setUseLocalSession(false);
      sessionStorage.removeItem('digital_window_offline_session');
      setAuthError(null);
    } catch (err) {
      console.error("Sign-out error: ", err);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-[#F4F4F5] dark:bg-[#0F0F11] font-sans" id="auth-loading-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[4px] border-black dark:border-white border-t-transparent dark:border-t-transparent animate-spin rounded-full" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-neutral-400 dark:text-neutral-500 animate-pulse">Initializing Window...</span>
        </div>
      </div>
    );
  }

  if (!user && !useLocalSession) {
    const landingBg = isDarkMode ? '#0F0F11' : '#F5F5F7';
    const landingCardBg = isDarkMode ? '#1E1E22' : '#FFFFFF';
    const landingText = isDarkMode ? '#F5F5F7' : '#111111';
    const landingDotColor = isDarkMode ? '#ffffff10' : '#11111115';

    return (
      <div 
        id="auth-landing-view"
        style={{ 
          backgroundImage: `radial-gradient(${landingDotColor} 3px, transparent 3px)`, 
          backgroundSize: '32px 32px',
          backgroundColor: landingBg,
          color: landingText,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 12px)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 12px)'
        }}
        className="w-full h-[100dvh] flex flex-col items-center justify-center transition-colors duration-300 animate-fade-in overflow-y-auto select-none font-sans"
      >
        <div 
          id="auth-landing-card"
          style={{ backgroundColor: landingCardBg, borderColor: isDarkMode ? '#FFFFFF40' : '#111111' }}
          className="w-full max-w-[460px] md:max-w-3xl border-[4px] rounded-sm shadow-[8px_8px_0px_#11111126] dark:shadow-[8px_8px_0px_#00000050] p-4 sm:p-8 flex flex-col gap-4 sm:gap-6 text-center relative overflow-hidden transition-all duration-300 my-auto font-sans text-neutral-900 dark:text-neutral-100"
        >
          {/* Quick theme control */}
          <div className="absolute top-3 right-3 z-10">
            <button 
              id="landing-toggle-theme-btn"
              onClick={() => {
                const toggled = !isDarkMode;
                setIsDarkMode(toggled);
                localStorage.setItem('digital_window_theme', toggled ? 'dark' : 'light');
              }} 
              className="p-1.5 rounded-sm border-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-all cursor-pointer"
              title="Toggle theme inside preview"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Header section */}
          <div className="flex flex-col gap-2 mt-1 relative z-10">
            <div 
              style={{ backgroundColor: isDarkMode ? '#2D2D35' : '#F4F4F5', borderColor: isDarkMode ? '#FFFFFF22' : '#111111' }}
              className="mx-auto w-12 h-12 sm:w-16 sm:h-16 border-[3px] border-black flex items-center justify-center font-black rounded-lg shadow-[3px_3px_0px_#11111126] dark:shadow-[3px_3px_0px_#00000045] mb-1 scale-100 relative select-none"
            >
              <FileText className="w-6 h-6 sm:w-8 sm:h-8" style={{ stroke: isDarkMode ? '#F5F5F7' : '#111111' }} strokeWidth={2.2} />
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase leading-none bg-gradient-to-b from-neutral-900 to-neutral-750 dark:from-white dark:to-neutral-300 bg-clip-text">
              web notes
            </h1>
            <p className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center justify-center gap-1.5">
              <span>distraction-free plain text editor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>

          <div style={{ backgroundColor: isDarkMode ? '#ffffff10' : '#11111110' }} className="w-full h-px relative z-10" />

          {/* Setup / choice grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto w-full relative z-10">
            
            {/* Option A: Cloud Space */}
            <div 
              id="cloud-option-card"
              style={{ borderColor: isDarkMode ? '#ffffff15' : '#E4E4E7' }}
              className="flex flex-col p-4 border-[2.5px] rounded-sm hover:border-black dark:hover:border-white/35 transition-all duration-200"
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ef4444] font-black mb-1">RECOMMENDED</span>
              <h3 className="text-sm font-black uppercase tracking-wide mb-1 leading-snug">Cloud Save & Sync</h3>
              <p className="text-[11px] leading-relaxed opacity-60 mb-4 flex-grow">
                Securely back up your writing to Google Cloud. Keep all your notes saved automatically and beautifully in sync in real-time across your desktop, laptop, and mobile devices.
              </p>

              <div className="flex flex-col gap-3.5 mt-auto">
                <div className="flex flex-col gap-1.5">
                  <button
                    id="landing-signin-redirect-btn"
                    onClick={handleSignInRedirect}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      borderWidth: '2px',
                      borderColor: 'black'
                    }}
                    className="w-full py-2.5 text-xs font-black transition-all shadow-[2.5px_2.5px_0px_#000] hover:-translate-y-[0.5px] hover:shadow-[3.5px_3.5px_0px_#000] active:translate-y-px active:shadow-[1px_1px_0px_#000] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer rounded-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 bg-white p-0.5 rounded-full shadow-sm">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Google Sign In (Redirect)</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    id="landing-signin-popup-btn"
                    onClick={handleSignInPopup}
                    style={{
                      backgroundColor: isDarkMode ? '#2D2D35' : '#F4F4F5',
                      color: isDarkMode ? '#F5F5F7' : '#111111',
                      borderWidth: '2px',
                      borderColor: 'black'
                    }}
                    className="w-full py-2 text-xs font-black transition-all shadow-[2px_2px_0px_#11111126] dark:shadow-[2px_2px_0px_#000] hover:-translate-y-[0.5px] hover:shadow-[3px_3px_0px_#11111126] active:translate-y-px active:shadow-[1px_1px_0px_#000] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer rounded-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 bg-white p-0.5 rounded-full shadow-sm">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Google Sign In (Popup)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Option B: Local Space */}
            <div 
              id="local-option-card"
              style={{ borderColor: isDarkMode ? '#ffffff15' : '#E4E4E7' }}
              className="flex flex-col p-4 border-[2.5px] rounded-sm hover:border-black dark:hover:border-white/35 transition-all duration-200"
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#22c55e] font-black mb-1">100% PRIVATE</span>
              <h3 className="text-sm font-black uppercase tracking-wide mb-1 leading-snug">Local Offline Sandbox</h3>
              <p className="text-[11px] leading-relaxed opacity-60 mb-4 flex-grow">
                Write completely privately. Your documents remain cached exclusively inside your local browser memory sandbox and never touch the cloud. No setup or accounts required.
              </p>

              <button
                id="landing-use-local-btn"
                onClick={() => {
                  if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
                  setUseLocalSession(true);
                  sessionStorage.setItem('digital_window_offline_session', 'true');
                }}
                className={`w-full mt-auto py-2.5 text-xs font-black border-[2.5px] transition-all rounded-sm uppercase tracking-wider cursor-pointer ${
                  isDarkMode 
                    ? 'text-neutral-300 hover:bg-white hover:text-black hover:border-white border-neutral-700' 
                    : 'text-neutral-900 hover:bg-black hover:text-white hover:border-black border-neutral-300'
                }`}
              >
                Launch Local Sandbox
              </button>
            </div>

          </div>

          {/* Connection Error Diagnostic Output */}
          {authError && (
            <div id="landing-auth-error" style={{ borderColor: '#ef4444' }} className="text-left border-[3px] bg-red-400/5 dark:bg-red-950/10 text-red-700 dark:text-red-400 p-3 rounded-sm text-[11px] max-w-xl mx-auto w-full">
              <span className="font-extrabold uppercase block mb-1">⚠️ Security Connection Issue Details:</span>
              <p className="font-mono leading-tight text-[10.5px] mb-1.5 break-all">{authError}</p>
              
              {authError.includes('Authorized Domain') && (
                <div className="mt-2.5 border-t border-red-500/20 pt-2 flex flex-col gap-1.5 font-sans">
                  <span className="font-extrabold text-[9px]">FIREBASE AUTH DOMAINS LIST ENFORCEMENT:</span>
                  <code className="bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded text-[10px] select-all font-mono border border-black/10 dark:border-white/10 text-center text-red-600 dark:text-red-400 font-extrabold">
                    {window.location.hostname}
                  </code>
                  <a 
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="underline text-[10px] font-extrabold text-blue-600 dark:text-sky-450 block text-center"
                  >
                    {"Configure Firebase Authentication -> Authorized Domains ↗"}
                  </a>
                </div>
              )}
            </div>
          )}



        </div>
      </div>
    );
  }

  const funkyBorder = 'border-[3px] border-black';
  const funkyShadow = 'shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000]';
  const funkyActive = 'hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]';
  const funkyTransition = 'transition-all duration-75 ease-out';
  const actionBtn = `flex flex-shrink-0 whitespace-nowrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 font-black ${funkyTransition} ${funkyBorder} ${funkyShadow} ${funkyActive} uppercase cursor-pointer`;

  return (
    <div 
      onContextMenu={handleContextMenu}
      style={{ 
        backgroundImage: `radial-gradient(${themeModeSettings.text}10 3px, transparent 3px)`, 
        backgroundSize: '32px 32px',
        backgroundColor: themeModeSettings.bg,
        color: themeModeSettings.text
      }}
      className={`relative w-full h-screen h-[100dvh] flex flex-row font-sans overflow-hidden transition-colors duration-200`}
    >
      <style>{`
        /* Dynamic Theme Palette Override Stylesheet */
        
        /* 1. Force retro elements to use active theme's matching text color with low opacity, creating softer lines */
        .border-black,
        .border-r-black,
        .border-b-black,
        .border-t-black,
        .border-current,
        .border-\\[3px\\],
        .border-\\[4px\\],
        .border-\\[2\\.5px\\] {
          border-color: ${themeModeSettings.text}55 !important; /* Soft, themed border accent */
        }

        .border-black\\/15 {
          border-color: ${themeModeSettings.text}22 !important;
        }
        
        .border-black\\/10 {
          border-color: ${themeModeSettings.text}18 !important;
        }

        /* 2. Soft translucent shadows for retro components, cards, buttons, avoiding harsh solid dark/light */
        .shadow-\\[8px_0px_0px_\\#000\\],
        .shadow-\\[8px_0px_0px_#000\\] {
          box-shadow: 8px 0px 0px ${themeModeSettings.text}26 !important; /* ~15% opacity current theme text color shadow */
        }
        
        .shadow-\\[6px_6px_0px_\\#000\\],
        .shadow-\\[6px_6px_0px_\\#fff\\],
        .shadow-\\[6px_6px_0px_#000\\] {
          box-shadow: 6px 6px 0px ${themeModeSettings.text}26 !important;
        }
        
        .shadow-\\[4px_4px_0px_\\#000\\],
        .shadow-\\[4px_4px_0px_\\#fff\\],
        .shadow-\\[4px_4px_0px_#000\\] {
          box-shadow: 4px 4px 0px ${themeModeSettings.text}22 !important;
        }
        
        .shadow-\\[3px_3px_0px_\\#000\\],
        .shadow-\\[3px_3px_0px_\\#fff\\],
        .shadow-\\[3px_3px_0px_#000\\] {
          box-shadow: 3px 3px 0px ${themeModeSettings.text}22 !important;
        }
        
        .shadow-\\[2px_2px_0px_\\#000\\],
        .shadow-\\[2px_2px_0px_\\#fff\\],
        .shadow-\\[2px_2px_0px_#000\\] {
          box-shadow: 2px 2px 0px ${themeModeSettings.text}1a !important;
        }

        /* Hover shadow adjustments */
        .hover\\:shadow-\\[3px_3px_0px_\\#000\\]:hover {
          box-shadow: 3px 3px 0px ${themeModeSettings.text}33 !important;
        }

        /* 3. Button Hover behavior: uses the active theme highlight accent */
        .menu-btn:hover {
          background-color: ${themeModeSettings.activeNoteBg} !important;
          color: ${themeModeSettings.activeNoteText} !important;
        }
        
        /* 5. Custom scrollbar track/thumb thematic integration */
        ::-webkit-scrollbar-track {
          border-left: 1px solid ${themeModeSettings.text}1c !important;
          background: transparent !important;
        }
        ::-webkit-scrollbar-thumb {
          background: ${themeModeSettings.text}2b !important; /* ~17% opacity themed thumb */
          border-left: 1px solid ${themeModeSettings.text}1c !important;
        }
        
        /* 6. Settings Panel specifics */
        .bg-black\\/5 {
          background-color: ${themeModeSettings.text}0d !important; /* ~5% opacity */
        }
        .hover\\:bg-black\\/5:hover {
          background-color: ${themeModeSettings.text}1a !important; /* ~10% opacity */
        }
        
        /* Selection stats panel line divider */
        .bg-black\\/40 {
          background-color: ${themeModeSettings.text}40 !important; /* 25% opacity */
        }

        /* 7. Input/Placeholder thematic consistency */
        input::placeholder,
        textarea::placeholder {
          color: ${themeModeSettings.text} !important;
          opacity: 0.25 !important;
        }
        
        /* Inactive items opacity */
        .opacity-50 {
          opacity: 0.65 !important;
        }
        
        /* Font buttons alignment */
        .text-black\\/60 {
          color: ${themeModeSettings.text}99 !important;
        }

      `}</style>

      {/* Extreme Left Hover Detector Strip */}
      {!isSidebarOpen && !focusMode && (
        <div
          onMouseEnter={() => handleMouseEnter(550)}
          onMouseLeave={handleMouseLeave}
          className="fixed left-0 top-0 bottom-0 w-4 z-40 bg-transparent cursor-default"
          title="Hover edge to reveal sidebar"
        />
      )}

      {/* Sidebar Overlay on Mobile/Tablet */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsSidebarPinned(false);
              setIsSidebarHovered(false);
            }}
            className="fixed inset-0 bg-black/60 z-45 md:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Push Area */}
      <motion.div
        initial={false}
        animate={{ 
          width: isSidebarOpen ? "min(100vw, 384px)" : "0px",
          borderRightWidth: isSidebarOpen ? 3 : 0,
          boxShadow: isSidebarOpen ? `8px 0px 0px ${themeModeSettings.text}` : `0px 0px 0px ${themeModeSettings.text}`
        }}
        style={{
          backgroundColor: themeModeSettings.sidebarBg,
          color: themeModeSettings.text
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="sidebar-container h-full z-50 flex-shrink-0 overflow-hidden border-black absolute md:relative left-0 top-0 bottom-0 transition-colors duration-200"
      >
        <div 
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            paddingBottom: isMobile 
              ? 'calc(env(safe-area-inset-bottom, 0px) + 76px)' 
              : 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 16px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 16px)'
          }}
          className="w-[100vw] sm:w-[381px] flex-shrink-0 h-full flex flex-col gap-4 sm:gap-6 font-sans justify-between box-border min-h-0"
        >
          <AnimatePresence mode="wait">
            {isSettingsExpanded ? (
              <motion.div
                key="settings-group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 justify-between font-sans"
              >
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                  <div className="flex justify-between items-center px-1 flex-shrink-0 pb-1.5 border-b-[3px] border-black">
                    <h2 className="text-xl font-black tracking-widest uppercase flex items-center gap-2">
                      <Settings size={22} className="animate-spin-slow" /> SETTINGS
                    </h2>
                  </div>

                  {/* Settings Tab Selector */}
                  <div className="flex border-[3px] border-black p-0.5 bg-neutral-100 dark:bg-neutral-900 shadow-[2px_2px_0px_#000] flex-shrink-0 text-[10px] sm:text-[11px] font-black tracking-wider uppercase">
                    {(['display', 'themes', 'cloud'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSettingsTab(tab)}
                        style={settingsTab === tab ? {
                          backgroundColor: themeModeSettings.activeNoteBg,
                          color: themeModeSettings.activeNoteText
                        } : {
                          color: themeModeSettings.cardText
                        }}
                        className={`flex-1 py-1.5 text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          settingsTab === tab 
                            ? 'shadow-sm font-black' 
                            : 'opacity-75 hover:opacity-100 font-extrabold'
                        }`}
                      >
                        {tab === 'display' && <Eye size={12} />}
                        {tab === 'themes' && <Sun size={12} />}
                        {tab === 'cloud' && <Clock size={12} />}
                        <span className="uppercase">{tab}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 pt-1 custom-scrollbar flex flex-col gap-4 min-h-0">
                    {settingsTab === 'display' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3"
                      >
                        {/* Show Clock */}
                        <div className="flex items-center justify-between w-full p-3 sm:p-4 border-[3px] border-black rounded-sm bg-black/5 relative">
                          <div className="flex flex-col text-left pr-2 flex-1 min-w-0">
                            <span className="uppercase text-xs font-black tracking-wider leading-tight">Show Clock</span>
                            <span className="text-[10px] font-sans tracking-wide font-medium opacity-60 leading-normal mt-0.5">DISPLAY LOCAL TIME INDICATOR IN STATUS BAR</span>
                          </div>
                          <button
                            onClick={() => {
                              setShowClock(prev => !prev);
                              if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
                            }}
                            style={{
                              backgroundColor: showClock ? themeModeSettings.activeNoteBg : themeModeSettings.sidebarBg,
                            }}
                            className="w-12 h-[26px] border-[3px] border-black flex items-center p-[2px] cursor-pointer rounded-sm transition-colors duration-150 select-none shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000]"
                            title={`Turn clock ${showClock ? 'OFF' : 'ON'}`}
                          >
                            <motion.div 
                              layout
                              style={{
                                backgroundColor: showClock ? themeModeSettings.activeNoteText : themeModeSettings.cardText,
                              }}
                              className="w-[16px] h-[16px] border-[2px] border-black flex-shrink-0 rounded-[1px] shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                              animate={{ x: showClock ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* Show Stats Panel */}
                        <div className="flex items-center justify-between w-full p-3 sm:p-4 border-[3px] border-black rounded-sm bg-black/5 relative">
                          <div className="flex flex-col text-left pr-2 flex-1 min-w-0">
                            <span className="uppercase text-xs font-black tracking-wider leading-tight">Show Stats Panel</span>
                            <span className="text-[10px] font-sans tracking-wide font-medium opacity-60 leading-normal mt-0.5">SHOW WORD AND CHARACTER COUNTS IN STATUS BAR</span>
                          </div>
                          <button
                            onClick={() => {
                              setShowStatusBar(prev => !prev);
                              if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
                            }}
                            style={{
                              backgroundColor: showStatusBar ? themeModeSettings.activeNoteBg : themeModeSettings.sidebarBg,
                            }}
                            className="w-12 h-[26px] border-[3px] border-black flex items-center p-[2px] cursor-pointer rounded-sm transition-colors duration-150 select-none shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000]"
                            title={`Turn stats ${showStatusBar ? 'OFF' : 'ON'}`}
                          >
                            <motion.div 
                              layout
                              style={{
                                backgroundColor: showStatusBar ? themeModeSettings.activeNoteText : themeModeSettings.cardText,
                              }}
                              className="w-[16px] h-[16px] border-[2px] border-black flex-shrink-0 rounded-[1px] shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                              animate={{ x: showStatusBar ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* Distraction-Free Mode */}
                        <div className="flex items-center justify-between w-full p-3 sm:p-4 border-[3px] border-black rounded-sm bg-black/5 relative" title="Hides toolbars when typing. Hover over top to reveal.">
                          <div className="flex flex-col text-left pr-2 flex-1 min-w-0">
                            <span className="uppercase text-xs font-black tracking-wider leading-tight">Focus Mode</span>
                            <span className="text-[10px] font-sans tracking-wide font-medium opacity-60 leading-normal mt-0.5">HIDES FORMATTING CONTROLS AND BARS WHEN TYPING</span>
                          </div>
                          <button
                            onClick={() => {
                              setFocusMode(prev => !prev);
                              if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
                            }}
                            style={{
                              backgroundColor: focusMode ? themeModeSettings.activeNoteBg : themeModeSettings.sidebarBg,
                            }}
                            className="w-12 h-[26px] border-[3px] border-black flex items-center p-[2px] cursor-pointer rounded-sm transition-colors duration-150 select-none shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000]"
                            title={`Turn focus mode ${focusMode ? 'OFF' : 'ON'}`}
                          >
                            <motion.div 
                              layout
                              style={{
                                backgroundColor: focusMode ? themeModeSettings.activeNoteText : themeModeSettings.cardText,
                              }}
                              className="w-[16px] h-[16px] border-[2px] border-black flex-shrink-0 rounded-[1px] shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                              animate={{ x: focusMode ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* Font Style Section */}
                        <div className="flex flex-col gap-1.5 mt-2">
                          <span className="text-xs uppercase tracking-wider font-black px-1 opacity-80">editor font options</span>
                          <div style={{ backgroundColor: themeModeSettings.cardBg }} className="grid grid-cols-3 gap-1 border-[3px] border-black p-1">
                            {(['sans', 'mono', 'serif'] as const).map(f => (
                              <button
                                key={f}
                                onClick={() => setFontPreference(f)}
                                style={fontPreference === f ? {
                                  backgroundColor: themeModeSettings.activeNoteBg,
                                  color: themeModeSettings.activeNoteText,
                                  borderColor: themeModeSettings.activeNoteBg
                                } : {
                                  backgroundColor: themeModeSettings.sidebarBg,
                                  color: themeModeSettings.cardText,
                                  borderColor: "transparent"
                                }}
                                className={`py-1.5 text-xs font-black uppercase border-2 transition-all duration-75 cursor-pointer ${
                                  fontPreference === f
                                    ? 'shadow-[2px_2px_0px_#000]'
                                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white font-extrabold'
                                }`}
                              >
                                {f === 'sans' ? 'normal' : f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'themes' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3 animate-fade-in"
                      >
                        {/* App Theme Selection */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs uppercase tracking-wider font-extrabold px-1 opacity-80">App Theme Options</span>
                          <div style={{ backgroundColor: themeModeSettings.cardBg }} className="flex flex-col gap-1.5 p-1.5 border-[3px] border-black max-h-[220px] overflow-y-auto custom-scrollbar">
                            {APP_THEMES.map(theme => {
                              const isSelected = selectedThemeId === theme.id;
                              const currentSettings = isDarkMode ? theme.dark : theme.light;
                              
                              return (
                                <button
                                  key={theme.id}
                                  type="button"
                                  onClick={() => setSelectedThemeId(theme.id)}
                                  style={isSelected ? {
                                    backgroundColor: themeModeSettings.activeNoteBg,
                                    color: themeModeSettings.activeNoteText,
                                    borderColor: themeModeSettings.activeNoteBg
                                  } : {
                                    backgroundColor: themeModeSettings.sidebarBg,
                                    color: themeModeSettings.cardText,
                                    borderColor: "transparent"
                                  }}
                                  className={`w-full group text-left p-2 border-2 select-none cursor-pointer flex items-center justify-between gap-3 ${funkyTransition} ${
                                    isSelected 
                                      ? 'font-black shadow-[2px_2px_0px_#000]' 
                                      : 'font-bold hover:opacity-90'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* Visual Color Swatch */}
                                    <div className="flex items-center -space-x-1 flex-shrink-0">
                                      <div className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm" style={{ backgroundColor: currentSettings.bg }} title="Page BG" />
                                      <div className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm" style={{ backgroundColor: currentSettings.sidebarBg }} title="Sidebar" />
                                      <div className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm" style={{ backgroundColor: currentSettings.cardBg }} title="Card" />
                                      <div className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm" style={{ backgroundColor: currentSettings.activeNoteBg }} title="Active Note" />
                                    </div>
                                    <span className="text-[11px] uppercase tracking-wider truncate">
                                      {theme.name}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    {isSelected ? (
                                      <div 
                                        style={{ backgroundColor: themeModeSettings.bg, color: themeModeSettings.text }}
                                        className="flex items-center justify-center w-3.5 h-3.5 border border-current rounded-full"
                                      >
                                        <Check size={8} strokeWidth={3} />
                                      </div>
                                    ) : (
                                      <div className="w-3.5 h-3.5 border border-black/20 dark:border-white/20 rounded-full" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Keyboard Press Sounds */}
                        <div className="flex flex-col gap-1.5 w-full mt-2">
                          <div className="flex items-center justify-between w-full p-3 sm:p-4 border-[3px] border-black rounded-sm bg-black/5 relative">
                            <div className="flex flex-col text-left pr-2 flex-1 min-w-0">
                              <span className="uppercase text-xs font-black tracking-wider leading-tight">Typing clicks</span>
                              <span className="text-[10px] font-sans tracking-wide font-medium opacity-60 leading-normal mt-0.5">SATISFYING TYPEWRITER & MECHANICAL AUDIO</span>
                            </div>
                            <button
                              onClick={() => {
                                const nextState = !keySoundsEnabled;
                                setKeySoundsEnabled(nextState);
                                if (nextState) {
                                  playKeySound('Space', keySoundProfile);
                                }
                              }}
                              style={{
                                backgroundColor: keySoundsEnabled ? themeModeSettings.activeNoteBg : themeModeSettings.sidebarBg,
                              }}
                              className="w-12 h-[26px] border-[3px] border-black flex items-center p-[2px] cursor-pointer rounded-sm transition-colors duration-150 select-none shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000]"
                              title={`Turn typing clicks ${keySoundsEnabled ? 'OFF' : 'ON'}`}
                            >
                              <motion.div 
                                layout
                                style={{
                                  backgroundColor: keySoundsEnabled ? themeModeSettings.activeNoteText : themeModeSettings.cardText,
                                }}
                                className="w-[16px] h-[16px] border-[2px] border-black flex-shrink-0 rounded-[1px] shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                                animate={{ x: keySoundsEnabled ? 20 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>

                          {/* Sound Profile Selectors */}
                          {keySoundsEnabled && (
                            <div 
                              style={{ backgroundColor: themeModeSettings.cardBg }} 
                              className="grid grid-cols-2 gap-1 border-[3px] border-black p-1 w-[92%] mx-auto mt-0.5"
                            >
                              <button
                                onClick={() => setKeySoundProfile('thocky')}
                                style={
                                  keySoundProfile === 'thocky'
                                    ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText, borderColor: themeModeSettings.activeNoteBg }
                                    : { backgroundColor: themeModeSettings.sidebarBg, color: themeModeSettings.cardText, borderColor: 'transparent' }
                                }
                                className={`py-1.5 text-[10px] font-black uppercase tracking-wider border-2 hover:border-black/40 transition-all cursor-pointer`}
                                title="Play soft, creamy mechanical thocks"
                              >
                                Soft Thocky
                              </button>
                              <button
                                onClick={() => setKeySoundProfile('mechanical')}
                                style={
                                  keySoundProfile === 'mechanical'
                                    ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText, borderColor: themeModeSettings.activeNoteBg }
                                    : { backgroundColor: themeModeSettings.sidebarBg, color: themeModeSettings.cardText, borderColor: 'transparent' }
                                }
                                className={`py-1.5 text-[10px] font-black uppercase tracking-wider border-2 hover:border-black/40 transition-all cursor-pointer`}
                                title="Play crisp clacky mechanical typing sounds"
                              >
                                Mechanical
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'cloud' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3"
                      >
                        {/* Cloud Storage Account */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs uppercase tracking-wider font-extrabold px-1 opacity-80">Cloud Backup Sync</span>
                          {user ? (
                            <div style={{ backgroundColor: themeModeSettings.cardBg }} className="flex flex-col gap-3 p-3 border-[3px] border-black">
                              <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-black/20" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-neutral-200 border border-black/20 flex items-center justify-center font-black text-xs uppercase text-neutral-700">
                                    {user.email?.charAt(0) || 'U'}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-black uppercase truncate">{user.displayName || 'Authorized User'}</span>
                                  <span className="text-[10px] font-mono opacity-60 truncate">{user.email}</span>
                                </div>
                              </div>
                              <button
                                onClick={handleSignOut}
                                className="w-full py-1.5 border-2 border-red-500 hover:bg-red-500 hover:text-white font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer rounded-sm"
                              >
                                DISCONNECT CLOUD BACKUP
                              </button>
                            </div>
                          ) : (
                            <div style={{ backgroundColor: themeModeSettings.cardBg }} className="flex flex-col gap-2 p-3 border-[3px] border-black text-center">
                              <p className="text-[10px] font-bold opacity-60 uppercase">
                                {useLocalSession ? 'Using Local Sandbox' : 'Cloud Sync is inactive.'}
                              </p>
                              
                              <div className="flex flex-col gap-2.5 mt-1.5">
                                <button
                                  onClick={handleSignInRedirect}
                                  style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                                  className="w-full py-1.5 border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-[1px] hover:opacity-95 cursor-pointer flex items-center justify-center gap-1.5 rounded-sm"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 bg-white p-0.5 rounded-full shadow-sm text-black">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                  </svg>
                                  Google Redirect (Universal)
                                </button>
                                
                                <button
                                  onClick={handleSignInPopup}
                                  style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                                  className="w-full py-1.5 border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-[1px] hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5 rounded-sm"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 bg-white p-0.5 rounded-full shadow-sm text-black">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                  </svg>
                                  Google Popup (Direct)
                                </button>
                                
                                {useLocalSession && (
                                  <button
                                    onClick={() => {
                                      if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
                                      setUseLocalSession(false);
                                      sessionStorage.removeItem('digital_window_offline_session');
                                    }}
                                    className="w-full py-1.5 mt-1 border-2 border-dashed border-red-500 hover:border-solid hover:bg-red-500 hover:text-white dark:hover:text-black dark:hover:bg-red-400 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer rounded-sm"
                                  >
                                    Return to Login
                                  </button>
                                )}
                              </div>

                              {authError && (
                                <div className="mt-2 text-left border-2 border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 p-2 rounded-sm text-[9px] leading-snug">
                                  <span className="font-extrabold uppercase block mb-0.5">⚠️ Connection issue:</span>
                                  <p className="font-mono text-[8.5px] break-words">{authError}</p>
                                  
                                  {authError.includes('Authorized Domain') && (
                                    <div className="mt-1 border-t border-red-500/20 pt-1 flex flex-col gap-1 font-sans">
                                      <span className="font-extrabold text-[8px] opacity-75">ADD THIS DOMAIN IN FIREBASE:</span>
                                      <code className="bg-neutral-100 dark:bg-neutral-900 px-1 py-0.5 rounded text-[8px] break-all select-all font-mono border border-black/10 text-center font-bold text-red-600 dark:text-red-400">
                                        {window.location.hostname}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Export Active Note Button Block style */}
                        <div className="flex flex-col gap-1.5 mt-2 border-t-[3px] border-black/10 dark:border-white/10 pt-2.5">
                          <span className="text-xs uppercase tracking-wider font-extrabold px-1 opacity-80">Active Note Backup</span>
                          <button
                            onClick={exportNoteAsTxt}
                            style={{
                              backgroundColor: themeModeSettings.activeNoteBg,
                              color: themeModeSettings.activeNoteText
                            }}
                            className={`flex items-center justify-between w-full p-3 font-bold border-[3px] border-black ${funkyTransition} ${funkyShadow} ${funkyActive}`}
                            title="Save current note to device as a TXT file"
                          >
                            <span className="uppercase text-xs tracking-wider font-extrabold flex-1 text-left">Export Note (.txt)</span>
                            <div className="flex items-center justify-center p-0.5">
                              <Download size={16} />
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="border-t-[3px] border-black pt-4 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsExpanded(false);
                    }}
                    style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                    className={`w-full ${actionBtn} !py-3`}
                  >
                    BACK TO MENU
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="notes-group"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 justify-between"
              >
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                  <div className="flex justify-between items-center px-1 flex-shrink-0 pb-3 border-b-[3px] border-black/15 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div 
                        style={{ backgroundColor: themeModeSettings.activeNoteBg }}
                        className="w-9 h-9 border-[3px] border-black flex items-center justify-center font-black rounded-sm flex-shrink-0 shadow-[2px_2px_0px_#000]"
                      >
                        <FileText className="w-5 h-5" style={{ stroke: themeModeSettings.activeNoteText }} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[17px] font-black tracking-wider uppercase leading-none">WEB NOTES</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSidebarPinned(false);
                        setIsSidebarHovered(false);
                      }}
                      style={{ backgroundColor: themeModeSettings.cardBg, color: themeModeSettings.cardText }}
                      className="p-1.5 border-[3px] border-black hover:opacity-90 transition-colors active:translate-y-[1px] cursor-pointer"
                      title="Close Menu"
                    >
                      <MenuIcon size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={createNewNote}
                    style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                    className={`${actionBtn} py-4 text-lg flex-shrink-0`}
                  >
                    <Plus size={24} /> CREATE NEW
                  </button>

                  {/* Retro Search Bar */}
                  <div className="relative flex-shrink-0">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="SEARCH NOTES..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (keySoundsEnabledRef.current) {
                          playKeySound(e.key, keySoundProfileRef.current);
                        }
                      }}
                      style={{ backgroundColor: themeModeSettings.cardBg, color: themeModeSettings.cardText }}
                      className="w-full pl-10 pr-9 py-2.5 font-mono text-xs font-black uppercase tracking-wider border-[3px] border-black placeholder:text-black/40 dark:placeholder:text-[#F4F4F5]/40 focus:outline-none focus:ring-0 transition-colors duration-75"
                    />
                    <Search 
                      size={14} 
                      style={{ color: themeModeSettings.cardText }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 font-black opacity-60" 
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:scale-110 active:scale-95 transition-all"
                        title="Clear search"
                      >
                        <X 
                          size={14} 
                          className="text-red-500" 
                        />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pb-4 pr-1 pt-1 custom-scrollbar flex flex-col gap-4">
                    {filteredNotes.length === 0 ? (
                      <div 
                        style={{ backgroundColor: themeModeSettings.cardBg, color: '#ef4444' }}
                        className={`p-6 border-[3px] border-black text-center font-black ${funkyShadow}`}
                      >
                        <p className="text-sm tracking-wide uppercase">NO NOTES FOUND</p>
                        <p className="text-[10px] opacity-60 font-mono mt-1">TRY ANOTHER QUERY</p>
                      </div>
                    ) : (
                      filteredNotes.map(note => {
                        const isActive = activeNoteId === note.id;
                        const noteCardStyle = isActive 
                            ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }
                            : { backgroundColor: themeModeSettings.cardBg, color: themeModeSettings.cardText };
                        
                        return (
                          <div
                            key={note.id}
                            onClick={() => { setActiveNoteId(note.id); }}
                            style={noteCardStyle}
                            className={`text-left px-5 py-5 flex flex-row items-center justify-between gap-4 ${funkyTransition} cursor-pointer group ${funkyShadow} ${funkyActive} border-[3px] border-black`}
                          >
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                               <span className="font-black truncate text-xl uppercase">{note.title || 'UNTITLED'}</span>
                               <span className="text-sm opacity-80 line-clamp-2 leading-relaxed font-mono whitespace-pre-wrap">{getNotePreviewText(note.content)}</span>
                            </div>
                            <button 
                               onClick={(e) => handleDeleteNote(e, note.id)} 
                               className="flex-shrink-0 w-8 h-8 cursor-pointer flex items-center justify-center rounded-sm opacity-50 hover:opacity-100 hover:text-[#ff5555] transition-all duration-75 select-none"
                               title="Close note"
                            >
                               <X size={20} className="stroke-[2.5]" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t-[3px] border-black pt-4 flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsExpanded(true);
                    }}
                    className="flex justify-between items-center w-full px-4 py-3 font-sans hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-[3px] border-black bg-black/5 dark:bg-white/5 active:translate-y-[1px] active:translate-x-[1px]"
                    title="Open Settings Panel"
                  >
                    <div className="text-xs font-black tracking-widest uppercase flex items-center gap-2 opacity-90 select-none">
                      <Settings size={14} /> SETTINGS
                    </div>
                    <div className="opacity-95 text-[10px] font-black uppercase">
                      OPEN »
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Main Container Area */}
      <div className="flex-1 h-full flex flex-col min-h-0 min-w-0 relative z-10">
        {/* Top Navbar */}
        <nav 
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 16px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 16px)'
          }}
          className={`w-full flex flex-row justify-between items-center gap-2 sm:gap-6 font-bold text-sm tracking-wide relative z-20 flex-shrink-0 transition-opacity duration-300 ${focusMode ? 'opacity-0 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}
        >
            <div className="flex sm:flex-1 justify-start gap-4 items-center flex-shrink-0">
            {!isSidebarOpen && (
              <button
                style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSidebarPinned(p => !p);
                }}
                className={`menu-btn ${actionBtn} ${isSidebarPinned ? 'shadow-none translate-x-[3px] translate-y-[3px]' : ''}`}
                title="Menu"
              >
                <MenuIcon size={20} className="flex-shrink-0" />
                <span className="hidden sm:inline">MENU</span>
              </button>
            )}
          </div>
          
          <div className="hidden sm:flex justify-center flex-shrink-0 h-[46px]">
            <AnimatePresence>
              {showClock && (
                <motion.div
                  key="clock-display"
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                  className={`flex flex-shrink-0 items-center font-sans text-base sm:text-lg font-black tracking-widest uppercase tabular-nums px-4.5 border-[3px] border-black rounded-lg shadow-[3px_3px_0px_#000] select-none h-full`}
                >
                  <span className="tracking-tight uppercase">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex sm:flex-1 flex-row justify-end items-center gap-1.5 sm:gap-4 flex-shrink-0">
            <AnimatePresence>
              {editor && !editor.isDestroyed && editor.can().undo() && (
                <motion.button
                  key="undo-btn"
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ duration: 0.15 }}
                  style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                  onClick={() => editor.chain().focus().undo().run()}
                  className={`${actionBtn}`}
                  title="Undo"
                >
                  <Undo size={18} />
                </motion.button>
              )}
            </AnimatePresence>
 
            <AnimatePresence>
              {editor && !editor.isDestroyed && editor.can().redo() && (
                <motion.button
                  key="redo-btn"
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ duration: 0.15 }}
                  style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                  onClick={() => editor.chain().focus().redo().run()}
                  className={`${actionBtn}`}
                  title="Redo"
                >
                  <Redo size={18} />
                </motion.button>
              )}
            </AnimatePresence>
 
            <button
              style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
              onClick={exportNoteAsTxt}
              className={`${actionBtn}`}
              title="Save current note to device as TXT file"
            >
              <Download size={18} />
            </button>
 
            <button
              style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`${actionBtn}`}
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
 
            <button
              style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
              onClick={toggleFullscreen}
              className={`${actionBtn} sm:flex hidden`}
              title="Toggle fullscreen"
            >
              <Maximize size={18} />
            </button>
          </div>
        </nav>
 
        {/* Main Text Area */}
        <main 
          className={`flex-1 w-full pb-16 pt-8 z-10 mx-auto overflow-y-auto custom-scrollbar flex flex-col items-center editor-wrap-${fontPreference}`}
        >
          <div className="w-full max-w-[1600px] px-4 sm:px-12 md:px-20 lg:px-32 xl:px-48 mb-4 flex-shrink-0">
            <input
               value={activeNote.title}
               onChange={(e) => updateActiveNote({ title: e.target.value })}
               onKeyDown={(e) => {
                 if (keySoundsEnabledRef.current) {
                   playKeySound(e.key, keySoundProfileRef.current);
                 }
               }}
               placeholder="ENTER TITLE..."
               className={`title-input-field w-full bg-transparent border-b-[6px] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black pb-4 pr-2 focus:ring-0 focus:outline-none placeholder:opacity-20 uppercase tracking-tighter text-inherit border-current`}
               spellCheck={false}
            />
          </div>

          <div ref={editorRelativeContainerRef} className="w-full max-w-[1600px] flex-1 flex-shrink-0 relative">
            {editor && !editor.isDestroyed && (
              <BubbleMenu 
                editor={editor} 
                shouldShow={({ state }) => {
                  if (state.selection && 'node' in state.selection) {
                    const nodeSel = state.selection as any;
                    if (nodeSel.node && nodeSel.node.type.name === 'horizontalRule') {
                      return true;
                    }
                  }
                  return !state.selection.empty;
                }}
                style={{
                  backgroundColor: themeModeSettings.cardBg,
                  color: themeModeSettings.cardText
                }}
                className={`flex gap-1 p-2 rounded-lg z-50 border-[3px] border-black shadow-[4px_4px_0px_#000]`}
              >
                {editor.state.selection && 'node' in editor.state.selection && (editor.state.selection as any).node?.type.name === 'horizontalRule' ? (
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteSelection().run();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-red-500/20 text-red-500 dark:text-red-400 font-extrabold uppercase font-mono text-[11px]"
                    title="Delete Selected Divider"
                  >
                    <Trash2 size={16} />
                    <span>Delete Selected Divider</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      style={editor.isActive('bold') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Bold"
                    >
                      <Bold size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      style={editor.isActive('italic') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Italic"
                    >
                      <Italic size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      style={editor.isActive('underline') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Underline"
                    >
                      <UnderlineIcon size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      style={editor.isActive('strike') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Strikethrough"
                    >
                      <Strikethrough size={16} />
                    </button>
                    <div style={{ backgroundColor: themeModeSettings.cardText + '25' }} className="w-px h-6 my-auto mx-1" />
                    <button
                      onClick={() => editor.chain().focus().setParagraph().run()}
                      style={editor.isActive('paragraph') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Body text (Paragraph)"
                    >
                      <Type size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      style={editor.isActive('heading', { level: 1 }) ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Heading 1"
                    >
                      <Heading1 size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      style={editor.isActive('heading', { level: 2 }) ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Heading 2"
                    >
                      <Heading2 size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      style={editor.isActive('heading', { level: 3 }) ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Heading 3"
                    >
                      <Heading3 size={16} />
                    </button>
                    <div style={{ backgroundColor: themeModeSettings.cardText + '25' }} className="w-px h-6 my-auto mx-1" />
                    <button
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      style={editor.isActive('bulletList') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Bullet List"
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      style={editor.isActive('orderedList') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Ordered List"
                    >
                      <ListOrdered size={16} />
                    </button>
                    <div style={{ backgroundColor: themeModeSettings.cardText + '25' }} className="w-px h-6 my-auto mx-1" />
                    <button
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      style={editor.isActive('blockquote') ? { backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText } : { color: themeModeSettings.cardText }}
                      className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Blockquote"
                    >
                      <Quote size={16} />
                    </button>
                    <div style={{ backgroundColor: themeModeSettings.cardText + '25' }} className="w-px h-6 my-auto mx-1" />
                    <button
                      onClick={() => editor.chain().focus().deleteSelection().run()}
                      className="p-2 rounded hover:bg-red-500/20 text-red-500 dark:text-red-400"
                      title="Delete Selection"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </BubbleMenu>
            )}
            {editor && !editor.isDestroyed && <EditorContent editor={editor} />}
          </div>
        </main>
        
        <AnimatePresence>
          {showStatusBar && !focusMode && (
            <motion.div
              key="status-bar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                bottom: isMobile 
                  ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)' 
                  : 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
                backgroundColor: themeModeSettings.cardBg,
                color: themeModeSettings.cardText
              }}
              className={`fixed z-40 border-[3px] border-black ${funkyShadow} px-4 py-2 font-mono text-xs font-black flex items-center gap-4`}
            >
              <span>{words} WORDS</span>
              <div className="w-1 h-3 bg-black/40" />
              <span>{chars} CHARS</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Browser Autosave Status Indicator */}
        <AnimatePresence>
          {saveStatus !== 'idle' && (
            <motion.div
              key="saving-indicator"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                bottom: isMobile 
                  ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)' 
                  : 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                backgroundColor: saveStatus === 'saving' ? (isDarkMode ? '#D97706' : '#FEF3C7') : themeModeSettings.cardBg,
                color: saveStatus === 'saving' ? (isDarkMode ? '#FFFFFF' : '#1F2937') : themeModeSettings.cardText
              }}
              className={`fixed left-4 z-40 border-[3px] border-black ${funkyShadow} px-3 py-1.5 font-mono text-xs font-black flex items-center gap-2.5`}
            >
              <div className="relative flex h-2 w-2 items-center justify-center">
                {saveStatus === 'saving' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  saveStatus === 'saving' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
              </div>
              <span className="uppercase tracking-wider">
                {saveStatus === 'saving' ? 'saving...' : 'saved to local'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Context Menu */}
        <AnimatePresence>
          {contextMenu && contextMenu.visible && (() => {
            const selection = getSelectionStats();
            const isRightHalf = contextMenu.x > window.innerWidth / 2;
            const isBottomHalf = contextMenu.y > window.innerHeight / 2;
            
            const positionStyle: React.CSSProperties = {
              position: 'fixed',
              zIndex: 9999,
              ...(isRightHalf 
                ? { right: window.innerWidth - contextMenu.x } 
                : { left: contextMenu.x }),
              ...(isBottomHalf 
                ? { bottom: window.innerHeight - contextMenu.y } 
                : { top: contextMenu.y }),
              maxHeight: isBottomHalf
                ? `min(540px, calc(${contextMenu.y}px - 15px))`
                : `min(540px, calc(${window.innerHeight - contextMenu.y}px - 15px))`
            };

            return (
              <motion.div
                ref={contextMenuRef}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.08, ease: "easeOut" }}
                style={{
                  ...positionStyle,
                  backgroundColor: themeModeSettings.sidebarBg,
                  color: themeModeSettings.text
                }}
                className="w-[220px] border-[3px] border-black shadow-[4px_4px_0px_#000] font-sans text-xs overflow-y-auto custom-scrollbar p-1 flex flex-col"
              >
                {/* Note Quick Control Section */}
                <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-b-2 border-black/10 dark:border-white/10 mb-1 select-none">
                  Note Actions
                </div>

                <button
                  onClick={() => {
                    createNewNote();
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Plus size={14} /> Create New</span>
                </button>

                <button
                  onClick={() => {
                    exportNoteAsTxt();
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Download size={14} /> Export (.txt)</span>
                </button>

                <button
                  onClick={() => {
                    setNoteToDelete(activeNoteId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#ff5555] hover:text-white dark:hover:bg-[#ff5555] border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-[#ff5555] dark:text-[#ff5555] hover:!text-white cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Trash2 size={14} /> Delete Note</span>
                </button>

                {/* Clipboard Actions */}
                <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-t-2 border-b-2 border-black/10 dark:border-white/10 my-1 select-none">
                  Clipboard
                </div>

                <button
                  disabled={!editor || editor.isDestroyed || !selection.hasSelection}
                  onClick={async () => {
                    if (!editor || editor.isDestroyed) return;
                    const { from, to } = editor.state.selection;
                    if (from === to) return;
                    const selectedText = editor.state.doc.textBetween(from, to, ' ');
                    try {
                      await navigator.clipboard.writeText(selectedText);
                    } catch (err) {
                      console.error("Copy failed: ", err);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2"><Copy size={14} /> Copy</span>
                </button>

                <button
                  disabled={!editor || editor.isDestroyed}
                  onClick={async () => {
                    if (!editor || editor.isDestroyed) return;
                    try {
                      const text = await navigator.clipboard.readText();
                      editor.chain().focus().insertContent(text).run();
                    } catch (err) {
                      console.error("Paste failed: ", err);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2"><Clipboard size={14} /> Paste</span>
                </button>

                {/* Insertion & Snippets Section */}
                <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-t-2 border-b-2 border-black/10 dark:border-white/10 my-1 select-none">
                  Snippets & Inserts
                </div>

                <button
                  disabled={!editor}
                  onClick={() => insertTimestamp()}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Insert Timestamp</span>
                  </span>
                </button>

                <button
                  disabled={!editor}
                  onClick={() => insertHorizontalLine()}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <Minus size={14} />
                    <span>Insert Line Rule</span>
                  </span>
                </button>



                {/* Appearance Section */}
                <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-t-2 border-b-2 border-black/10 dark:border-white/10 my-1 select-none">
                  View & Mode
                </div>

                <button
                  onClick={() => {
                    setFocusMode(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {focusMode ? <Eye size={14} /> : <EyeOff size={14} />} 
                    <span>Focus Mode</span>
                  </span>
                  {focusMode && <Check size={12} />}
                </button>

                <button
                  onClick={() => {
                    setIsDarkMode(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                    <span>Dark Mode</span>
                  </span>
                  {isDarkMode && <Check size={12} />}
                </button>

                <button
                  onClick={() => {
                    setShowClock(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Maximize size={14} />
                    <span>Clock Widget</span>
                  </span>
                  {showClock && <Check size={12} />}
                </button>

                <button
                  onClick={() => {
                    setShowStatusBar(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Info size={14} />
                    <span>Stats Panel</span>
                  </span>
                  {showStatusBar && <Check size={12} />}
                </button>

                {/* Selection Stats Strip (Only visible if there is selected text) */}
                {selection.hasSelection && (
                  <div className="border-t-2 border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 py-1.5 px-2 mt-1 -mx-1 -mb-1 select-none flex items-center justify-between font-mono text-[9px] text-black/70 dark:text-white/70">
                    <span className="font-bold">SELECTION STATS:</span>
                    <span>{selection.words}W | {selection.chars}C</span>
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Note Deletion Confirmation Modal */}
        <AnimatePresence>
          {noteToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 font-sans"
              onClick={() => setNoteToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                style={{ backgroundColor: themeModeSettings.sidebarBg, color: themeModeSettings.text }}
                className={`w-full max-w-sm border-[4px] border-black p-6 flex flex-col gap-4 text-center cursor-default shadow-[6px_6px_0px_#000]`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center mb-1">
                  <div className="w-16 h-16 rounded-full border-[3.5px] border-black bg-red-100 dark:bg-red-950/40 text-[#ff5555] dark:text-[#ff3333] flex items-center justify-center shadow-[3.5px_3.5px_0px_#000] -rotate-6 transition-all duration-200 hover:rotate-0 hover:scale-105">
                    <Trash2 size={30} className="stroke-[2.5]" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wide leading-tight">
                  Delete Note?
                </h3>
                <p className="text-xs sm:text-sm font-bold opacity-80 leading-relaxed max-w-[280px] mx-auto">
                  Are you sure you want to permanently delete this note? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center mt-3">
                  <button
                    onClick={() => setNoteToDelete(null)}
                    className="flex-1 py-2 px-4 uppercase font-black text-xs border-[3px] border-black bg-black/5 hover:bg-black/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (noteToDelete) {
                        deleteNoteById(noteToDelete);
                        setNoteToDelete(null);
                      }
                    }}
                    className="flex-1 py-2 px-4 uppercase font-black text-xs border-[3px] border-black bg-[#ff5555] text-white hover:bg-red-600 transition-colors shadow-[2px_2px_0px_#000] cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
