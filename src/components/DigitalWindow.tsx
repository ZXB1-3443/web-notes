import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Edit3, Moon, Sun, Menu as MenuIcon, Plus, X, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3, Type, List, ListOrdered, Quote, Undo, Redo, Settings, Search, Download, ChevronDown, ChevronUp, Trash2, Check, Eye, EyeOff, Clock, Minus, Eraser, Info, Copy, Clipboard, FileText, Sparkles, Shield, Keyboard, Volume2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { playKeySound, playTypewriterBell } from '../utils/keyboardAudio';

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
      activeNoteBg: '#2D2D33',
      activeNoteText: '#F5F5F7'
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
      activeNoteBg: '#4C2A3D',
      activeNoteText: '#f8f8f2'
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
      activeNoteBg: '#440F2D',
      activeNoteText: '#00FF9C'
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
      activeNoteBg: '#23382B',
      activeNoteText: '#E2ECE9'
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
      activeNoteBg: '#2E184A',
      activeNoteText: '#F1E6FF'
    }
  }
];



export default function DigitalWindow() {
  const user = null;

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
  const [settingsTab, setSettingsTab] = useState<'display' | 'themes' | 'sound' | 'cloud'>('display');
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
    let activeBg = themeModeSettings.bg;

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
  }, [isDarkMode, themeModeSettings.bg]);

  const [keySoundsEnabled, setKeySoundsEnabled] = useState(() => {
    const saved = localStorage.getItem('digital_window_key_sounds');
    return saved !== 'false';
  });

  const [keySoundProfile, setKeySoundProfile] = useState<'thocky' | 'mechanical'>(() => {
    const saved = localStorage.getItem('digital_window_key_sound_profile');
    return (saved || 'thocky') as 'thocky' | 'mechanical';
  });

  const [keySoundVolume, setKeySoundVolume] = useState<number>(() => {
    const saved = localStorage.getItem('digital_window_key_sound_volume');
    return saved !== null ? Number(saved) : 0.7;
  });

  const [bellSoundEnabled, setBellSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('digital_window_bell_sound_enabled');
    return saved !== 'false';
  });

  const [showGridBg, setShowGridBg] = useState(() => {
    const saved = localStorage.getItem('digital_window_show_grid_bg');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('digital_window_key_sounds', String(keySoundsEnabled));
    keySoundsEnabledRef.current = keySoundsEnabled;
  }, [keySoundsEnabled]);

  useEffect(() => {
    localStorage.setItem('digital_window_key_sound_profile', keySoundProfile);
    keySoundProfileRef.current = keySoundProfile;
  }, [keySoundProfile]);

  useEffect(() => {
    localStorage.setItem('digital_window_key_sound_volume', String(keySoundVolume));
    keySoundVolumeRef.current = keySoundVolume;
  }, [keySoundVolume]);

  useEffect(() => {
    localStorage.setItem('digital_window_bell_sound_enabled', String(bellSoundEnabled));
    bellSoundEnabledRef.current = bellSoundEnabled;
  }, [bellSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('digital_window_show_grid_bg', String(showGridBg));
    showGridBgRef.current = showGridBg;
  }, [showGridBg]);

  const keySoundsEnabledRef = React.useRef(keySoundsEnabled);
  const keySoundProfileRef = React.useRef(keySoundProfile);
  const keySoundVolumeRef = React.useRef(keySoundVolume);
  const bellSoundEnabledRef = React.useRef(bellSoundEnabled);
  const showGridBgRef = React.useRef(showGridBg);

  const activeNoteIdRef = React.useRef(activeNoteId);
  const activeNoteRef = React.useRef(activeNote);

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
    activeNoteRef.current = activeNote;
  }, [activeNoteId, activeNote]);

  const playClick = (key: string = 'Space') => {
    if (keySoundsEnabledRef.current) {
      playKeySound(key, keySoundProfileRef.current, keySoundVolumeRef.current);
      if (key === 'Enter' && bellSoundEnabledRef.current) {
        playTypewriterBell(keySoundVolumeRef.current);
      }
    }
  };

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
          playClick(event.key);
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
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('digital_window_theme_id', selectedThemeId);
  }, [selectedThemeId]);



  useEffect(() => {
    localStorage.setItem('digital_window_show_clock', String(showClock));
  }, [showClock]);

  useEffect(() => {
    localStorage.setItem('digital_window_show_status', String(showStatusBar));
  }, [showStatusBar]);

  useEffect(() => {
    localStorage.setItem('digital_window_font', fontPreference);
  }, [fontPreference]);

  useEffect(() => {
    localStorage.setItem('digital_window_focus', String(focusMode));
  }, [focusMode]);

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
  }, []);

  const deleteNoteById = React.useCallback((id: string) => {
    const actId = activeNoteIdRef.current;

    setNotesList(prev => {
      if (prev.length === 1) {
        const newNote = { id: Date.now().toString(), title: '', content: '', updatedAt: Date.now() };
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
  }, []);

  const updateActiveNote = (updates: Partial<Note>) => {
    const actId = activeNoteIdRef.current;
    const nowStamp = Date.now();

    setNotesList(prev => 
      prev.map(n => 
        n.id === actId 
          ? { ...n, ...updates, updatedAt: nowStamp } 
          : n
      )
    );
  };

  const triggerDeleteNote = (id: string) => {
    setActiveNoteId(id);
    setIsSidebarPinned(false);
    setIsSidebarHovered(false);
    setNoteToDelete(id);
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerDeleteNote(id);
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
          triggerDeleteNote(activeNoteId);
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
    
    // Do not show custom context menu if right-clicking on a divider (horizontal rule)
    const isDivider = 
      target.tagName === 'HR' || 
      target.closest('hr') || 
      target.closest('[data-type="horizontalRule"]') ||
      (target.classList.contains('ProseMirror-selectednode') && target.querySelector('hr')) ||
      target.closest('.ProseMirror-selectednode') ||
      (editor && !editor.isDestroyed && editor.state.selection && 'node' in editor.state.selection && (editor.state.selection as any).node?.type?.name === 'horizontalRule' && target.closest('.tiptap'));
      
    if (isDivider) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
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



  const funkyBorder = 'border-[3px] border-black';
  const funkyShadow = 'shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000]';
  const funkyActive = 'hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]';
  const funkyTransition = 'transition-all duration-75 ease-out';
  const actionBtn = `flex flex-shrink-0 whitespace-nowrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 font-black ${funkyTransition} ${funkyBorder} ${funkyShadow} ${funkyActive} uppercase cursor-pointer`;

  return (
    <div 
      onContextMenu={handleContextMenu}
      style={{ 
        backgroundImage: showGridBg ? `radial-gradient(${themeModeSettings.text}10 3px, transparent 3px)` : 'none', 
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
          border-color: ${isDarkMode ? `${themeModeSettings.text}1F` : `${themeModeSettings.text}55`} !important; /* Soft, themed border accent */
        }

        .border-black\\/15 {
          border-color: ${isDarkMode ? `${themeModeSettings.text}10` : `${themeModeSettings.text}22`} !important;
        }
        
        .border-black\\/10 {
          border-color: ${isDarkMode ? `${themeModeSettings.text}0C` : `${themeModeSettings.text}18`} !important;
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

        /* Context Menu item styles */
        .context-menu-item {
          color: ${themeModeSettings.cardText} !important;
          border: 2px solid transparent !important;
          background-color: transparent !important;
          transition: all 75ms ease-out !important;
        }
        .context-menu-item:hover:not(:disabled) {
          background-color: ${themeModeSettings.activeNoteBg} !important;
          color: ${themeModeSettings.activeNoteText} !important;
          border-color: ${themeModeSettings.text}33 !important;
        }
        .context-menu-delete-item {
          color: #ff5555 !important;
          border: 2px solid transparent !important;
          background-color: transparent !important;
          transition: all 75ms ease-out !important;
        }
        .context-menu-delete-item:hover:not(:disabled) {
          background-color: #ff5555 !important;
          color: #ffffff !important;
          border-color: #ff5555 !important;
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

        /* Prevent touch devices from being trapped in Focus Mode by ensuring the nav is slightly visible in status-bar/nav areas, making it completely tap-receptive */
        @media (pointer: coarse) {
          .focus-mode-nav-hidden {
            opacity: 0.25 !important;
          }
          .focus-mode-nav-hidden:hover,
          .focus-mode-nav-hidden:active,
          .focus-mode-nav-hidden:focus-within {
            opacity: 1 !important;
          }
        }

      `}</style>

      {/* Extreme Left Hover Detector Strip */}
      {!isSidebarOpen && !focusMode && (
        <div
          onMouseEnter={() => handleMouseEnter(350)}
          onMouseLeave={handleMouseLeave}
          className="fixed left-0 top-[85px] bottom-0 w-[12vw] max-w-[120px] z-40 bg-transparent cursor-default"
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
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => {
              setIsSidebarPinned(false);
              setIsSidebarHovered(false);
            }}
            className="fixed inset-0 bg-black/60 z-45 lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Push Area */}
      <motion.div
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? "100vw" : "384px") : "0px",
        }}
        style={{
          backgroundColor: themeModeSettings.sidebarBg,
          color: themeModeSettings.text
        }}
        transition={{ 
          type: "spring",
          stiffness: 320,
          damping: 26
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          setIsSidebarPinned(true);
        }}
        className="sidebar-container h-full z-50 flex-shrink-0 overflow-hidden border-r border-black/10 absolute lg:relative left-0 top-0 bottom-0 transition-colors duration-200 select-none"
      >
        <motion.div 
          initial={false}
          animate={{
            x: isSidebarOpen ? 0 : (isMobile ? "-100vw" : "-384px")
          }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 26
          }}
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
          <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-1 relative">
            <AnimatePresence>
              {isSettingsExpanded ? (
                <motion.div
                  key="settings-group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  style={{ gridArea: '1 / 1' }}
                  className="w-full h-full flex flex-col gap-3 sm:gap-4 min-h-0 justify-between font-sans"
                >
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                  <div className="flex justify-between items-center px-1 flex-shrink-0 pb-1.5 border-b-[3px] border-black">
                    <h2 className="text-xl font-black tracking-widest uppercase flex items-center gap-2">
                      <Settings size={22} className="animate-spin-slow" /> SETTINGS
                    </h2>
                  </div>

                  {/* Settings Tab Selector */}
                  <div className="grid grid-cols-3 border-[3px] border-black p-0.5 bg-neutral-100 dark:bg-neutral-900 shadow-[2px_2px_0px_#000] flex-shrink-0 text-[10px] sm:text-[10.5px] font-black tracking-wider uppercase">
                    {(['display', 'themes', 'sound'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSettingsTab(tab)}
                        style={settingsTab === tab ? {
                          backgroundColor: themeModeSettings.activeNoteBg,
                          color: themeModeSettings.activeNoteText
                        } : {
                          color: themeModeSettings.cardText
                        }}
                        className={`py-1.5 text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          settingsTab === tab 
                            ? 'shadow-sm font-black' 
                            : 'opacity-75 hover:opacity-100 font-extrabold'
                        }`}
                      >
                        {tab === 'display' && <Eye size={11} />}
                        {tab === 'themes' && <Sun size={11} />}
                        {tab === 'sound' && <Volume2 size={11} />}
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
                              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
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
                              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
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
                              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
                            />
                          </button>
                        </div>

                        {/* Show Grid Backdrop */}
                        <div className="flex items-center justify-between w-full p-3 sm:p-4 border-[3px] border-black rounded-sm bg-black/5 relative">
                          <div className="flex flex-col text-left pr-2 flex-1 min-w-0">
                            <span className="uppercase text-xs font-black tracking-wider leading-tight">Dotted Grid</span>
                            <span className="text-[10px] font-sans tracking-wide font-medium opacity-60 leading-normal mt-0.5">DISPLAY EXPERIMENTAL GEOMETRIC DOT PATTERN IN BACKGROUND</span>
                          </div>
                          <button
                            onClick={() => {
                              setShowGridBg(prev => !prev);
                              playClick('Space');
                            }}
                            style={{
                              backgroundColor: showGridBg ? themeModeSettings.activeNoteBg : themeModeSettings.sidebarBg,
                            }}
                            className="w-12 h-[26px] border-[3px] border-black flex items-center p-[2px] cursor-pointer rounded-sm transition-colors duration-150 select-none shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000]"
                            title={`Turn backdrop grid ${showGridBg ? 'OFF' : 'ON'}`}
                          >
                            <motion.div 
                              layout
                              style={{
                                backgroundColor: showGridBg ? themeModeSettings.activeNoteText : themeModeSettings.cardText,
                              }}
                              className="w-[16px] h-[16px] border-[2px] border-black flex-shrink-0 rounded-[1px] shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                              animate={{ x: showGridBg ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
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
                                onClick={() => {
                                  setFontPreference(f);
                                  playClick('Space');
                                }}
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
                      </motion.div>
                    )}

                    {settingsTab === 'sound' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3 animate-fade-in"
                      >
                        {/* Keyboard Press Sounds */}
                        <div className="flex flex-col gap-1.5 w-full">
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
                                  playKeySound('Space', keySoundProfile, keySoundVolume);
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
                                transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
                              />
                            </button>
                          </div>

                          {/* Sound Profile Selectors */}
                          {keySoundsEnabled && (
                            <>
                              <div 
                                style={{ backgroundColor: themeModeSettings.cardBg }} 
                                className="grid grid-cols-2 gap-1 border-[3px] border-black p-1 w-[92%] mx-auto mt-0.5 animate-fade-in"
                              >
                                <button
                                  onClick={() => {
                                    setKeySoundProfile('thocky');
                                    playKeySound('Space', 'thocky', keySoundVolume);
                                  }}
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
                                  onClick={() => {
                                    setKeySoundProfile('mechanical');
                                    playKeySound('Space', 'mechanical', keySoundVolume);
                                  }}
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

                              {/* Volume Level Slider */}
                              <div className="flex flex-col gap-1 w-[92%] mx-auto mt-3 animate-fade-in">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider opacity-80 px-0.5">
                                  <span>Volume Level</span>
                                  <span className="font-mono">{Math.round(keySoundVolume * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={keySoundVolume}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setKeySoundVolume(val);
                                      playKeySound('Space', keySoundProfile, val);
                                    }}
                                    className="flex-1 accent-black h-4 border-[3px] border-black bg-neutral-200 dark:bg-neutral-800 rounded-none cursor-pointer outline-none"
                                  />
                                </div>
                              </div>

                              {/* Typewriter Bell Toggle */}
                              <div className="flex items-center justify-between w-full p-3 sm:p-4 border-[3px] border-black rounded-sm bg-black/5 relative mt-3 animate-fade-in">
                                <div className="flex flex-col text-left pr-2 flex-1 min-w-0">
                                  <span className="uppercase text-xs font-black tracking-wider leading-tight">Return Bell Sound</span>
                                  <span className="text-[10px] font-sans tracking-wide font-medium opacity-60 leading-normal mt-0.5">PLAYS A METALLIC RING UPON ENTER KEY PRESS</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const nextState = !bellSoundEnabled;
                                    setBellSoundEnabled(nextState);
                                    if (nextState) {
                                      playTypewriterBell(keySoundVolume);
                                    } else {
                                      playClick('Space');
                                    }
                                  }}
                                  style={{
                                    backgroundColor: bellSoundEnabled ? themeModeSettings.activeNoteBg : themeModeSettings.sidebarBg,
                                  }}
                                  className="w-12 h-[26px] border-[3px] border-black flex items-center p-[2px] cursor-pointer rounded-sm transition-colors duration-150 select-none shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000]"
                                  title={`Turn return bell ${bellSoundEnabled ? 'OFF' : 'ON'}`}
                                >
                                  <motion.div 
                                    layout
                                    style={{
                                      backgroundColor: bellSoundEnabled ? themeModeSettings.activeNoteText : themeModeSettings.cardText,
                                    }}
                                    className="w-[16px] h-[16px] border-[2px] border-black flex-shrink-0 rounded-[1px] shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                                    animate={{ x: bellSoundEnabled ? 20 : 0 }}
                                    transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
                                  />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}




                  </div>
                </div>

                <div className="border-t-[3px] border-black pt-4 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSidebarPinned(true);
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
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                style={{ gridArea: '1 / 1' }}
                className="w-full h-full flex flex-col gap-3 sm:gap-4 min-h-0 justify-between"
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
                    <div className="flex gap-1.5 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSidebarPinned(true);
                          setIsSettingsExpanded(true);
                        }}
                        style={{ backgroundColor: themeModeSettings.cardBg, color: themeModeSettings.cardText }}
                        className="p-1.5 border-[3px] border-black hover:opacity-90 transition-colors active:translate-y-[1px] cursor-pointer"
                        title="Settings"
                      >
                        <Settings size={18} />
                      </button>
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
                        <X size={18} />
                      </button>
                    </div>
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
                        playClick(e.key);
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
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
          className={`w-full flex flex-row justify-between items-center gap-2 sm:gap-6 font-bold text-sm tracking-wide relative z-20 flex-shrink-0 transition-opacity duration-300 select-none ${focusMode ? 'focus-mode-nav-hidden opacity-0 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}
        >
            <div className="flex sm:flex-1 justify-start gap-4 items-center flex-shrink-0">
            {!isSidebarOpen && (
              <button
                style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                onMouseEnter={() => handleMouseEnter(750)}
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
              {showClock && (() => {
                const { hoursStr, minutesStr, ampm } = formatClockTime(time);
                return (
                  <motion.div
                    key="clock-display"
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{ backgroundColor: themeModeSettings.activeNoteBg, color: themeModeSettings.activeNoteText }}
                    className={`flex flex-shrink-0 items-center px-4 border-[3px] border-black rounded-sm shadow-[3px_3px_0px_#000] select-none h-full text-base sm:text-lg font-black uppercase ${
                      fontPreference === 'mono' ? 'font-mono tracking-widest' :
                      fontPreference === 'serif' ? 'font-serif tracking-normal' :
                      'font-sans tracking-wide'
                    }`}
                  >
                    <span>{hoursStr}</span>
                    <span className={`mx-0.5 transition-opacity duration-200 ${time.getSeconds() % 2 === 0 ? 'opacity-100' : 'opacity-20'}`}>:</span>
                    <span>{minutesStr}</span>
                    <span className="ml-2 text-xs font-black opacity-80">{ampm}</span>
                  </motion.div>
                );
              })()}
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
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
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
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
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
              onClick={() => {
                if (keySoundsEnabled) playKeySound('Space', keySoundProfile);
                setIsDarkMode(prev => !prev);
              }}
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
                 playClick(e.key);
               }}
               placeholder="ENTER TITLE..."
               className={`title-input-field w-full bg-transparent border-b-[6px] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black pb-4 pr-2 focus:ring-0 focus:outline-none placeholder:opacity-20 uppercase tracking-tighter text-inherit border-current`}
               spellCheck={false}
            />
          </div>

          <div ref={editorRelativeContainerRef} className="w-full max-w-[1600px] flex-1 flex-shrink-0 relative">
            {editor && !editor.isDestroyed && (
              <>
                {/* Bubble Menu for Dividers */}
                <BubbleMenu 
                  editor={editor} 
                  shouldShow={({ state }) => {
                    if (state.selection && 'node' in state.selection) {
                      const nodeSel = state.selection as any;
                      return !!(nodeSel.node && nodeSel.node.type.name === 'horizontalRule');
                    }
                    return false;
                  }}
                  style={{
                    backgroundColor: themeModeSettings.cardBg,
                    color: themeModeSettings.cardText
                  }}
                  className={`flex gap-1 p-2 rounded-lg z-50 border-[3px] border-black shadow-[4px_4px_0px_#000]`}
                >
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
              </BubbleMenu>

              {/* Bubble Menu for Text Formatting */}
              <BubbleMenu 
                editor={editor} 
                shouldShow={({ state }) => {
                  if (state.selection && 'node' in state.selection) {
                    const nodeSel = state.selection as any;
                    if (nodeSel.node && nodeSel.node.type.name === 'horizontalRule') {
                      return false;
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
              </BubbleMenu>
              </>
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
              className={`fixed z-40 border-[3px] border-black ${funkyShadow} px-4 py-2 font-mono text-xs font-black flex items-center gap-4 select-none`}
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
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              style={{
                bottom: isMobile 
                  ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)' 
                  : 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                backgroundColor: saveStatus === 'saving' ? (isDarkMode ? '#D97706' : '#FEF3C7') : themeModeSettings.cardBg,
                color: saveStatus === 'saving' ? (isDarkMode ? '#FFFFFF' : '#1F2937') : themeModeSettings.cardText
              }}
              className={`fixed left-4 z-40 border-[3px] border-black ${funkyShadow} px-3 py-1.5 font-mono text-xs font-black flex items-center gap-2.5 select-none`}
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
                transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
                style={{
                  ...positionStyle,
                  backgroundColor: themeModeSettings.cardBg,
                  color: themeModeSettings.cardText
                }}
                className="w-[220px] border-[3px] border-black shadow-[4px_4px_0px_#000] font-sans text-xs overflow-y-auto custom-scrollbar p-1 flex flex-col select-none"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Plus size={14} /> Create New</span>
                </button>

                <button
                  onClick={() => {
                    exportNoteAsTxt();
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Download size={14} /> Export (.txt)</span>
                </button>

                <button
                  onClick={() => {
                    triggerDeleteNote(activeNoteId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 context-menu-delete-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 cursor-pointer"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Insert Timestamp</span>
                  </span>
                </button>

                <button
                  disabled={!editor}
                  onClick={() => insertHorizontalLine()}
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
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
                  className="w-full text-left px-2.5 py-1.5 context-menu-item font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
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
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 font-sans"
              onClick={() => setNoteToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.8 }}
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
