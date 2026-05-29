import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Edit3, Moon, Sun, Menu as MenuIcon, Plus, X, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3, Type, List, ListOrdered, Quote, Undo, Redo, Settings, Search, Download, ChevronDown, ChevronUp, Trash2, Check, Eye, EyeOff, Clock, Minus, Eraser, Info } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

export default function DigitalWindow() {
  const [notesList, setNotesList] = useState<Note[]>(() => {
    const saved = localStorage.getItem('digital_window_all_notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.length > 0) return parsed;
    }
    
    const oldNotes = localStorage.getItem('digital_window_notes');
    if (oldNotes) {
      return [{ id: '1', title: '', content: oldNotes, updatedAt: Date.now() }];
    }
    return [{ 
      id: Date.now().toString(), 
      title: 'welcome', 
      content: '<h2>welcome to digital window.</h2><p>this is a quiet, distraction-free writing environment built for your thoughts, ideas, and drafts.</p><p>everything you compose here is auto-saved locally to your browser. no server sync, no accounts, and zero trackers. your work remains yours alone.</p><p><strong>key features to explore:</strong></p><ul><li><strong>note management:</strong> create, search, and delete documents inside the retractable sidebar (hover or click menu).</li><li><strong>distraction-free:</strong> toggle focus mode in settings to auto-hide headers and toolbars when typing.</li><li><strong>typography:</strong> choose between clean sans-serif, typewriter mono, or classic serif editor fonts.</li><li><strong>exports:</strong> save and download your documents locally as clean `.txt` files with one click.</li></ul><p></p><p><em>clear your mind and enjoy the quiet writing experience.</em></p>', 
      updatedAt: Date.now() 
    }];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string>(() => notesList[0]?.id || '');
  const activeNote = notesList.find(n => n.id === activeNoteId) || notesList[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('digital_window_theme') === 'dark');

  const [time, setTime] = useState(new Date());

  const [showClock, setShowClock] = useState(() => {
    const saved = localStorage.getItem('digital_window_show_clock');
    return saved !== 'false';
  });

  const [showStatusBar, setShowStatusBar] = useState(() => {
    const saved = localStorage.getItem('digital_window_show_status');
    return saved !== 'false';
  });

  const [fontPreference, setFontPreference] = useState<'mono' | 'sans' | 'serif'>(() => {
    return (localStorage.getItem('digital_window_font') as 'mono' | 'sans' | 'serif') || 'sans';
  });

  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('digital_window_focus') === 'true';
  });

  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement>(null);

  const getStats = () => {
    if (!activeNote || !activeNote.content) return { words: 0, chars: 0 };
    const rawText = activeNote.content.replace(/<[^>]+>/g, ' ').trim();
    const chars = rawText.length;
    const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    return { words, chars };
  };

  const getSelectionStats = () => {
    if (!editor) return { words: 0, chars: 0, hasSelection: false };
    const { from, to } = editor.state.selection;
    if (from === to) return { words: 0, chars: 0, hasSelection: false };
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const chars = selectedText.length;
    const words = selectedText.trim() ? selectedText.trim().split(/\s+/).filter(Boolean).length : 0;
    return { words, chars, hasSelection: chars > 0 };
  };

  const transformSelectedText = (mode: 'upper' | 'lower' | 'title' | 'sentence') => {
    if (!editor) return;
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
    if (!editor) return;
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
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
    setContextMenu(null);
  };

  const toggleBlockquote = () => {
    if (!editor) return;
    editor.chain().focus().toggleBlockquote().run();
    setContextMenu(null);
  };

  const clearFormatting = () => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
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
      StarterKit,
      Underline,
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
        class: `tiptap w-full min-h-[50vh] bg-transparent border-0 px-4 sm:px-12 md:px-20 lg:px-32 xl:px-48 text-xl sm:text-2xl md:text-3xl font-mono leading-relaxed placeholder:opacity-30 focus:ring-0 focus:outline-none z-10 relative overflow-hidden ${isDarkMode ? 'text-[#f8f8f2]' : 'text-[#111]'}`,
        spellcheck: "true",
      },
    },
  });

  // Keep editor content in sync when switching notes
  useEffect(() => {
    if (editor && activeNote.content !== editor.getHTML()) {
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

  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (hoverRef.current) {
        setIsSidebarHovered(true);
      }
    }, 400);
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setTimeout(() => {
      if (!hoverRef.current) {
        setIsSidebarHovered(false);
      }
    }, 50);
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
    setNotesList(prev => {
      if (prev.length === 1) {
        const newNote = { id: Date.now().toString(), title: '', content: '', updatedAt: Date.now() };
        setActiveNoteId(newNote.id);
        return [newNote];
      } else {
        const newList = prev.filter(n => n.id !== id);
        if (activeNoteId === id) {
          const nextActive = newList[0] || prev[0];
          if (nextActive) setActiveNoteId(nextActive.id);
        }
        return newList;
      }
    });
  }, [activeNoteId]);

  const updateActiveNote = (updates: Partial<Note>) => {
    setNotesList(prev => 
      prev.map(n => 
        n.id === activeNoteId 
          ? { ...n, ...updates, updatedAt: Date.now() } 
          : n
      )
    );
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNoteById(id);
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
          deleteNoteById(activeNoteId);
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

  const funkyBorder = 'border-[3px] border-black';
  const funkyShadow = 'shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000]';
  const funkyActive = 'hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]';
  const funkyTransition = 'transition-all duration-75 ease-out';
  const actionBtn = `flex flex-shrink-0 whitespace-nowrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 font-black ${funkyTransition} ${funkyBorder} ${funkyShadow} ${funkyActive} uppercase cursor-pointer`;

  return (
    <div 
      onContextMenu={handleContextMenu}
      style={{ backgroundImage: isDarkMode ? 'radial-gradient(#ffffff08 3px, transparent 3px)' : 'radial-gradient(#00000008 3px, transparent 3px)', backgroundSize: '32px 32px' }}
      className={`relative w-full h-screen flex flex-row font-sans overflow-hidden transition-colors duration-200 ${isDarkMode ? 'bg-[#282a36] text-[#f8f8f2]' : 'bg-[#F2EDDE] text-black'}`}
    >
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
          boxShadow: isSidebarOpen ? "8px 0px 0px #000" : "0px 0px 0px #000"
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`sidebar-container h-full z-50 flex-shrink-0 overflow-hidden border-black ${isDarkMode ? 'bg-[#1e1f29] text-[#f8f8f2]' : 'bg-[#F2EDDE] text-black'} absolute md:relative left-0 top-0 bottom-0`}
      >
        <div className="w-screen sm:w-[384px] max-w-full h-full p-6 flex flex-col gap-6 font-sans justify-between">
          <AnimatePresence mode="wait">
            {isSettingsExpanded ? (
              <motion.div
                key="settings-group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col gap-4 min-h-0 justify-between h-full"
              >
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                  <div className="flex justify-between items-center px-1 flex-shrink-0 pb-3 border-b-[3px] border-black">
                    <h2 className="text-xl font-black tracking-widest uppercase flex items-center gap-2">
                      <Settings size={22} /> SETTINGS
                    </h2>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 pt-1 custom-scrollbar flex flex-col gap-4">
                    {/* Settings Toggles */}
                    <div className="flex flex-col gap-3">
                      {/* Show Clock */}
                      <button
                        onClick={() => setShowClock(prev => !prev)}
                        className={`flex items-center justify-between w-full p-3 font-bold border-[3px] border-black ${funkyTransition} ${funkyShadow} ${funkyActive} ${showClock ? (isDarkMode ? 'bg-[#50fa7b] text-black' : 'bg-[#00E5FF] text-black') : (isDarkMode ? 'bg-[#44475a] text-[#8be9fd]' : 'bg-white text-black')}`}
                      >
                        <span className="uppercase text-xs tracking-wider font-extrabold flex-1 text-left">Show Clock</span>
                        <div className={`w-5 h-5 border-[3px] border-black flex items-center justify-center font-black text-xs ${showClock ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}>
                          {showClock && "✓"}
                        </div>
                      </button>

                      {/* Show Stats Panel */}
                      <button
                        onClick={() => setShowStatusBar(prev => !prev)}
                        className={`flex items-center justify-between w-full p-3 font-bold border-[3px] border-black ${funkyTransition} ${funkyShadow} ${funkyActive} ${showStatusBar ? (isDarkMode ? 'bg-[#FF79C6] text-black' : 'bg-[#FF45A4] text-black') : (isDarkMode ? 'bg-[#44475a] text-[#8be9fd]' : 'bg-white text-black')}`}
                      >
                        <span className="uppercase text-xs tracking-wider font-extrabold flex-1 text-left">Show Stats Panel</span>
                        <div className={`w-5 h-5 border-[3px] border-black flex items-center justify-center font-black text-xs ${showStatusBar ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}>
                          {showStatusBar && "✓"}
                        </div>
                      </button>

                      {/* Focus Mode */}
                      <button
                        onClick={() => setFocusMode(prev => !prev)}
                        className={`flex items-center justify-between w-full p-3 font-bold border-[3px] border-black ${funkyTransition} ${funkyShadow} ${funkyActive} ${focusMode ? (isDarkMode ? 'bg-[#ff79c6] text-black' : 'bg-[#ff90e8] text-black') : (isDarkMode ? 'bg-[#44475a] text-[#8be9fd]' : 'bg-white text-black')}`}
                        title="Hides toolbars when typing for distraction-free writing. Hover over top to reveal header."
                      >
                        <span className="uppercase text-xs tracking-wider font-extrabold flex-1 text-left">Distraction-Free Mode</span>
                        <div className={`w-5 h-5 border-[3px] border-black flex items-center justify-center font-black text-xs ${focusMode ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}>
                          {focusMode && "✓"}
                        </div>
                      </button>

                      {/* Export Note Button */}
                      <button
                        onClick={exportNoteAsTxt}
                        className={`flex items-center justify-between w-full p-3 font-bold border-[3px] border-black ${funkyTransition} ${funkyShadow} ${funkyActive} ${isDarkMode ? 'bg-[#50fa7b] text-black' : 'bg-[#00ffd0] text-black'}`}
                        title="Save current note to device as a TXT file"
                      >
                        <span className="uppercase text-xs tracking-wider font-extrabold flex-1 text-left">Export Note (.txt)</span>
                        <div className="flex items-center justify-center p-0.5">
                          <Download size={16} />
                        </div>
                      </button>
                    </div>

                    {/* Font Style */}
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-xs uppercase tracking-wider font-black opacity-85 px-1">Editor Font Style</span>
                      <div className="grid grid-cols-3 gap-1 border-[3px] border-black p-1 bg-white dark:bg-[#282a36]">
                        {(['mono', 'sans', 'serif'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFontPreference(f)}
                            className={`py-2 text-xs font-black uppercase border-2 transition-all duration-75 ${
                              fontPreference === f
                                ? 'bg-black text-white border-black dark:bg-[#50fa7b] dark:text-black dark:border-[#50fa7b]'
                                : 'bg-transparent border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>


                  </div>
                </div>

                <div className="border-t-[3px] border-black pt-4 flex-shrink-0">
                  <button
                    onClick={() => setIsSettingsExpanded(false)}
                    className={`w-full ${actionBtn} !py-3 bg-black text-white dark:bg-white dark:text-black`}
                  >
                    BACK TO NOTES
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
                className="flex-1 flex flex-col gap-4 min-h-0 justify-between h-full"
              >
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                  <div className="flex justify-between items-center px-1 flex-shrink-0 pb-3 border-b-[3px] border-black/15 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 border-[3px] border-black ${isDarkMode ? 'bg-[#FF79C6]' : 'bg-[#FF90E8]'} flex items-center justify-center font-black rounded-sm flex-shrink-0 shadow-[2px_2px_0px_#000]`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 stroke-black">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[17px] font-black tracking-wider uppercase leading-none">WEB NOTES</span>
                        <span className="text-[8px] font-mono font-bold uppercase opacity-55 tracking-wider mt-0.5">Workspace</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSettingsExpanded(true)}
                      className="p-1.5 border-[3px] border-black bg-white dark:bg-[#343746] text-black dark:text-[#f8f8f2] hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:translate-y-[1px]"
                      title="Open Settings"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={createNewNote}
                    className={`${actionBtn} py-4 text-lg flex-shrink-0 ${isDarkMode ? 'bg-[#FFB86C] text-black' : 'bg-[#B200FF] text-white'}`}
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
                      className={`w-full pl-10 pr-9 py-2.5 font-mono text-xs font-black uppercase tracking-wider border-[3px] border-black placeholder:text-black/40 dark:placeholder:text-[#f8f8f2]/40 focus:outline-none focus:ring-0 ${
                        isDarkMode 
                          ? 'bg-[#282a36] text-[#f8f8f2] focus:bg-[#343746]' 
                          : 'bg-white text-black focus:bg-amber-50/20'
                      } transition-colors duration-75`}
                    />
                    <Search 
                      size={14} 
                      className={`absolute left-3 top-1/2 -translate-y-1/2 font-black ${
                        isDarkMode ? 'text-[#f8f8f2]/60' : 'text-black/60'
                      }`} 
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:scale-110 active:scale-95 transition-all"
                        title="Clear search"
                      >
                        <X 
                          size={14} 
                          className={isDarkMode ? 'text-[#ff5555]' : 'text-[#ff007f]'} 
                        />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pb-4 pr-1 pt-1 custom-scrollbar flex flex-col gap-4">
                    {filteredNotes.length === 0 ? (
                      <div className={`p-6 border-[3px] border-black text-center font-black ${
                        isDarkMode ? 'bg-[#282a36] text-[#ff5555]' : 'bg-white text-[#ff007f]'
                      } ${funkyShadow}`}>
                        <p className="text-sm tracking-wide uppercase">NO NOTES FOUND</p>
                        <p className="text-[10px] opacity-60 font-mono mt-1">TRY ANOTHER QUERY</p>
                      </div>
                    ) : (
                      filteredNotes.map(note => {
                        const isActive = activeNoteId === note.id;
                        const noteCardBg = isDarkMode 
                            ? (isActive ? 'bg-[#FF79C6] text-black' : 'bg-[#282a36] text-[#f8f8f2]')
                            : (isActive ? 'bg-[#FFE800] text-black' : 'bg-white text-black');
                        
                        return (
                          <div
                            key={note.id}
                            onClick={() => { setActiveNoteId(note.id); }}
                            className={`text-left px-5 py-5 flex flex-col gap-2 ${funkyTransition} cursor-pointer group ${funkyShadow} ${funkyActive} border-[3px] border-black ${noteCardBg}`}
                          >
                            <div className="flex justify-between items-start">
                               <span className="font-black truncate text-xl uppercase">{note.title || 'UNTITLED'}</span>
                               <button 
                                  onClick={(e) => handleDeleteNote(e, note.id)} 
                                  className="opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-75 flex-shrink-0 ml-2"
                                  title="Delete note"
                               >
                                  <X size={20} className={isDarkMode ? (isActive ? "text-[#FF0000]" : "text-[#FF5555]") : "text-[#FF007F]"} />
                               </button>
                            </div>
                            <span className="text-sm opacity-80 line-clamp-2 leading-relaxed font-mono whitespace-pre-wrap">{getNotePreviewText(note.content)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t-[3px] border-black pt-4 flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setIsSettingsExpanded(true)}
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
        <nav className={`w-full px-4 py-3 sm:px-6 sm:py-5 flex flex-row justify-between items-center gap-2 sm:gap-6 font-bold text-sm tracking-wide relative z-20 flex-shrink-0 transition-opacity duration-300 ${focusMode ? 'opacity-0 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}>
          
          <div className="flex sm:flex-1 justify-start gap-4 items-center flex-shrink-0">
            <button
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => setIsSidebarPinned(p => !p)}
              className={`menu-btn ${actionBtn} ${isDarkMode ? 'bg-[#FF79C6] text-black' : 'bg-[#FF90E8] text-black'} ${isSidebarPinned ? 'shadow-none translate-x-[3px] translate-y-[3px]' : ''}`}
              title="Menu"
            >
              <MenuIcon size={20} className="flex-shrink-0" />
              <span className="hidden sm:inline">MENU</span>
            </button>
          </div>
          
          <div className="hidden sm:flex justify-center flex-shrink-0 min-w-[120px] h-[46px]">
            <AnimatePresence>
              {showClock && (
                <motion.div
                  key="clock-display"
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-shrink-0 whitespace-nowrap items-center font-mono text-xl sm:text-2xl font-black px-6 py-2 border-[3px] border-black ${funkyShadow} ${funkyTransition} ${isDarkMode ? 'bg-[#8BE9FD] text-black' : 'bg-[#FFE800] text-black'}`}
                >
                  {time.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex sm:flex-1 flex-row justify-end items-center gap-1.5 sm:gap-4 flex-shrink-0">
            <AnimatePresence>
              {editor && editor.can().undo() && (
                <motion.button
                  key="undo-btn"
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => editor.chain().focus().undo().run()}
                  className={`${actionBtn} ${isDarkMode ? 'bg-[#BD93F9] text-[#1e1f29]' : 'bg-[#A8FFB2] text-black'}`}
                  title="Undo"
                >
                  <Undo size={18} />
                </motion.button>
              )}
            </AnimatePresence>
 
            <AnimatePresence>
              {editor && editor.can().redo() && (
                <motion.button
                  key="redo-btn"
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => editor.chain().focus().redo().run()}
                  className={`${actionBtn} ${isDarkMode ? 'bg-[#FF79C6] text-black' : 'bg-[#FFC4EB] text-black'}`}
                  title="Redo"
                >
                  <Redo size={18} />
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={exportNoteAsTxt}
              className={`${actionBtn} ${isDarkMode ? 'bg-[#50fa7b] text-black' : 'bg-[#00ffd0] text-black'}`}
              title="Save current note to device as TXT file"
            >
              <Download size={18} />
            </button>
 
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`${actionBtn} ${isDarkMode ? 'bg-[#F1FA8C] text-black' : 'bg-[#00E5FF] text-black'}`}
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
 
            <button
              onClick={toggleFullscreen}
              className={`${actionBtn} sm:flex hidden ${isDarkMode ? 'bg-[#BD93F9] text-[#1e1f29]' : 'bg-[#FF007F] text-black'}`}
              title="Toggle fullscreen"
            >
              <Maximize size={18} />
            </button>
          </div>
        </nav>
 
        {/* Main Text Area */}
        <main className={`flex-1 w-full pb-16 pt-8 z-10 mx-auto overflow-y-auto custom-scrollbar flex flex-col items-center editor-wrap-${fontPreference}`}>
          <div className="w-full max-w-[1600px] px-4 sm:px-12 md:px-20 lg:px-32 xl:px-48 mb-4 flex-shrink-0">
            <input
               value={activeNote.title}
               onChange={(e) => updateActiveNote({ title: e.target.value })}
               placeholder="ENTER TITLE..."
               className={`title-input-field w-full bg-transparent border-b-[6px] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black pb-4 pr-2 focus:ring-0 focus:outline-none placeholder:opacity-20 uppercase tracking-tighter ${isDarkMode ? 'border-white text-[#f8f8f2]' : 'border-black text-black'}`}
               spellCheck={false}
            />
          </div>
          <div className="w-full max-w-[1600px] flex-1 flex-shrink-0 relative">
            {editor && (
              <BubbleMenu 
                editor={editor} 
                className={`flex gap-1 p-2 rounded-lg shadow-xl z-50 ${isDarkMode ? 'bg-[#282a36] border border-[#6272a4] shadow-black/50' : 'bg-[#F2EDDE] border-2 border-black shadow-black/20'}`}
              >
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('bold') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('italic') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('underline') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Underline"
                >
                  <UnderlineIcon size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('strike') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Strikethrough"
                >
                  <Strikethrough size={16} />
                </button>
                <div className="w-px h-6 bg-black/20 dark:bg-white/20 my-auto mx-1" />
                <button
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('paragraph') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Body text (Paragraph)"
                >
                  <Type size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('heading', { level: 1 }) ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Heading 1"
                >
                  <Heading1 size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('heading', { level: 2 }) ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Heading 2"
                >
                  <Heading2 size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('heading', { level: 3 }) ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Heading 3"
                >
                  <Heading3 size={16} />
                </button>
                <div className="w-px h-6 bg-black/20 dark:bg-white/20 my-auto mx-1" />
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('bulletList') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Bullet List"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('orderedList') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Ordered List"
                >
                  <ListOrdered size={16} />
                </button>
                <div className="w-px h-6 bg-black/20 dark:bg-white/20 my-auto mx-1" />
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('blockquote') ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  title="Blockquote"
                >
                  <Quote size={16} />
                </button>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
          </div>
        </main>
        
        <AnimatePresence>
          {showStatusBar && !focusMode && (
            <motion.div
              key="status-bar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-4 right-4 z-40 border-[3px] border-black ${funkyShadow} px-4 py-2 font-mono text-xs font-black flex items-center gap-4 ${isDarkMode ? 'bg-[#BD93F9] text-black' : 'bg-white text-black'}`}
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
              className={`absolute bottom-4 left-4 z-40 border-[3px] border-black ${funkyShadow} px-3 py-1.5 font-mono text-xs font-black flex items-center gap-2.5 ${
                saveStatus === 'saving'
                  ? (isDarkMode ? 'bg-[#ffb86c] text-black' : 'bg-[#ffe800] text-black')
                  : (isDarkMode ? 'bg-[#50fa7b] text-black' : 'bg-[#a8ffb2] text-black')
              }`}
            >
              <div className="relative flex h-2 w-2 items-center justify-center">
                {saveStatus === 'saving' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  saveStatus === 'saving' ? 'bg-[#ff5555]' : 'bg-[#50fa7b]'
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
                style={positionStyle}
                className={`w-[260px] border-[3px] border-black shadow-[4px_4px_0px_#000] font-sans text-xs ${
                  isDarkMode ? 'bg-[#1e1f29] text-[#f8f8f2]' : 'bg-[#F2EDDE] text-black'
                } overflow-y-auto custom-scrollbar p-1 flex flex-col`}
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
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#FF79C6] hover:text-black dark:hover:bg-[#FF79C6] border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Plus size={14} /> Create New</span>
                  <span className="text-[9px] font-mono opacity-50">⌘N</span>
                </button>

                <button
                  onClick={() => {
                    exportNoteAsTxt();
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#50fa7b] hover:text-black dark:hover:bg-[#50fa7b] border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Download size={14} /> Export (.txt)</span>
                  <span className="text-[9px] font-mono opacity-50 font-black">⌘S</span>
                </button>

                <button
                  onClick={() => {
                    deleteNoteById(activeNoteId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#ff5555] hover:text-white dark:hover:bg-[#ff5555] border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-[#ff5555] dark:text-[#ff5555] hover:!text-white cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Trash2 size={14} /> Delete Note</span>
                  <span className="text-[9px] font-mono opacity-50">⌘⇧⌫</span>
                </button>

                {/* Typography & Formatting */}
                {editor && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-t-2 border-b-2 border-black/10 dark:border-white/10 my-1 select-none">
                      Formatting
                    </div>

                    <div className="grid grid-cols-2 gap-0.5 px-0.5 mb-1">
                      <button
                        disabled={!editor.can().undo()}
                        onClick={() => {
                          editor.chain().focus().undo().run();
                          setContextMenu(null);
                        }}
                        className="text-center py-1 bg-black/5 dark:bg-white/5 hover:bg-[#BD93F9] hover:text-black dark:hover:bg-[#BD93F9] border-2 border-transparent hover:border-black font-black uppercase transition-all duration-75 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:hover:border-transparent cursor-pointer disabled:cursor-not-allowed text-inherit rounded-sm text-[10px]"
                      >
                        Undo
                      </button>
                      <button
                        disabled={!editor.can().redo()}
                        onClick={() => {
                          editor.chain().focus().redo().run();
                          setContextMenu(null);
                        }}
                        className="text-center py-1 bg-black/5 dark:bg-white/5 hover:bg-[#FF79C6] hover:text-black dark:hover:bg-[#FF79C6] border-2 border-transparent hover:border-black font-black uppercase transition-all duration-75 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:hover:border-transparent cursor-pointer disabled:cursor-not-allowed text-inherit rounded-sm text-[10px]"
                      >
                        Redo
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        editor.chain().focus().toggleBold().run();
                        setContextMenu(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-[#8be9fd] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer ${
                        editor.isActive('bold') ? 'bg-black/10 dark:bg-white/15' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Bold size={14} />
                        <span>Bold</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {editor.isActive('bold') && <Check size={12} />}
                        <span className="text-[9px] font-mono opacity-50">⌘B</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        editor.chain().focus().toggleItalic().run();
                        setContextMenu(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-[#8be9fd] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer ${
                        editor.isActive('italic') ? 'bg-black/10 dark:bg-white/15' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Italic size={14} />
                        <span>Italic</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {editor.isActive('italic') && <Check size={12} />}
                        <span className="text-[9px] font-mono opacity-50">⌘I</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        editor.chain().focus().toggleUnderline().run();
                        setContextMenu(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-[#8be9fd] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer ${
                        editor.isActive('underline') ? 'bg-black/10 dark:bg-white/15' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UnderlineIcon size={14} />
                        <span>Underline</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {editor.isActive('underline') && <Check size={12} />}
                        <span className="text-[9px] font-mono opacity-50">⌘U</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        editor.chain().focus().toggleStrike().run();
                        setContextMenu(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-[#8be9fd] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer ${
                        editor.isActive('strike') ? 'bg-black/10 dark:bg-white/15' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Strikethrough size={14} />
                        <span>Strikethrough</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {editor.isActive('strike') && <Check size={12} />}
                        <span className="text-[9px] font-mono opacity-50">⌘⇧X</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        toggleBlockquote();
                        setContextMenu(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-[#8be9fd] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer ${
                        editor.isActive('blockquote') ? 'bg-black/10 dark:bg-white/15' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Quote size={14} />
                        <span>Blockquote</span>
                      </span>
                      {editor.isActive('blockquote') && <Check size={12} />}
                    </button>

                    <button
                      onClick={() => {
                        clearFormatting();
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[#ffb86c] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Eraser size={14} />
                        <span>Clear Style</span>
                      </span>
                      <span className="text-[9px] font-mono opacity-50">Clean</span>
                    </button>
                  </>
                )}

                {/* Selection Transformations Section */}
                <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-t-2 border-b-2 border-black/10 dark:border-white/10 my-1 select-none">
                  Selection Rules
                </div>

                {!selection.hasSelection ? (
                  <div className="px-3 py-2 text-[10px] font-semibold italic opacity-40 select-none">
                    Select text to transform cases
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => transformSelectedText('upper')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[#f1fa8c] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                    >
                      <span className="flex items-center gap-2"><span>A → A</span> <span>UPPERCASE</span></span>
                    </button>
                    <button
                      onClick={() => transformSelectedText('lower')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[#f1fa8c] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                    >
                      <span className="flex items-center gap-2"><span>a → a</span> <span>lowercase</span></span>
                    </button>
                    <button
                      onClick={() => transformSelectedText('title')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[#f1fa8c] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                    >
                      <span className="flex items-center gap-2"><span>T → C</span> <span>Title Case</span></span>
                    </button>
                    <button
                      onClick={() => transformSelectedText('sentence')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[#f1fa8c] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                    >
                      <span className="flex items-center gap-2"><span>S → c</span> <span>Sentence Case</span></span>
                    </button>
                  </>
                )}

                {/* Insertion & Snippets Section */}
                <div className="px-2 py-1.5 text-[10px] font-mono tracking-widest font-black uppercase opacity-50 border-t-2 border-b-2 border-black/10 dark:border-white/10 my-1 select-none">
                  Snippets & Inserts
                </div>

                <button
                  disabled={!editor}
                  onClick={() => insertTimestamp()}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#50fa7b] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Insert Timestamp</span>
                  </span>
                  <span className="text-[9px] font-mono opacity-40">Date</span>
                </button>

                <button
                  disabled={!editor}
                  onClick={() => insertHorizontalLine()}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#50fa7b] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <Minus size={14} />
                    <span>Insert Line Rule</span>
                  </span>
                  <span className="text-[9px] font-mono opacity-40">---</span>
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
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#ffb86c] hover:text-black dark:hover:bg-[#ffb86c] border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {focusMode ? <Eye size={14} /> : <EyeOff size={14} />} 
                    <span>Focus Mode</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {focusMode && <Check size={12} />}
                    <span className="text-[9px] font-mono opacity-50">⌘/</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDarkMode(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#f1fa8c] hover:text-black dark:hover:bg-[#f1fa8c] border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                    <span>Dark Mode</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isDarkMode && <Check size={12} />}
                    <span className="text-[9px] font-mono opacity-50">⌘D</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowClock(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#8be9fd] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Maximize size={14} />
                    <span>Clock Widget</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {showClock && <Check size={12} />}
                    <span className="text-[9px] font-mono opacity-50">⌘⇧C</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowStatusBar(p => !p);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#ff79c6] hover:text-black border-2 border-transparent hover:border-black font-extrabold uppercase flex items-center justify-between transition-all duration-75 text-inherit cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Info size={14} />
                    <span>Stats Panel</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {showStatusBar && <Check size={12} />}
                    <span className="text-[9px] font-mono opacity-50">⌘⇧S</span>
                  </div>
                </button>

                {/* Font Style Row */}
                <div className="border-t-2 border-black/10 dark:border-white/10 pt-1.5 mt-1 flex flex-col gap-1">
                  <div className="px-2 text-[9px] font-mono tracking-widest opacity-50 uppercase select-none">Editor Font</div>
                  <div className="grid grid-cols-3 gap-0.5 px-1 pb-1">
                    {(['sans', 'mono', 'serif'] as const).map(font => (
                      <button
                        key={font}
                        onClick={() => {
                          setFontPreference(font);
                          setContextMenu(null);
                        }}
                        className={`py-1 text-[10px] font-black uppercase border-[2px] transition-all duration-75 cursor-pointer ${
                          fontPreference === font
                            ? 'bg-black text-white border-black dark:bg-[#50fa7b] dark:text-black dark:border-[#50fa7b]'
                            : 'bg-transparent border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

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
      </div>
    </div>
  );
}
