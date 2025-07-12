import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Clock, Leaf, Music, Brain } from 'lucide-react'; // Removed Trophy, Target, Sparkles as they are not directly used as icons in the UI

// Define a type for a sound effect, for better organization
type SoundEffect = 'found' | 'levelUp' | 'buttonClick'; // Removed 'gameOver' as timer is elapsed, not countdown

const WordSearchGame = () => {
  const [gamePhase, setGamePhase] = useState('welcome'); // 'welcome', 'category', 'playing'
  const [welcomeColor, setWelcomeColor] = useState('#6B7280');
  const [currentQuote, setCurrentQuote] = useState('');

  // State to manage the core game data and status
  const [gameState, setGameState] = useState({
    grid: [] as string[][], // The 2D array representing the letter grid
    targetWords: [] as { word: string; start: { row: number; col: number }; direction: number; found: boolean }[], // Words to find
    foundWords: [] as string[], // Words already found by the player
    score: 0, // Player's current score
    level: 1, // Current puzzle level (increments with each new puzzle)
    category: '', // Selected category (e.g., 'nature', 'pop')
    theme: '', // Specific theme within the category (e.g., 'Forest', 'Movies')
    isLoading: false, // True when a new puzzle is being generated
    timeElapsed: 0, // Time spent on the current puzzle (counts up)
    gameActive: true, // True when grid interactions are enabled (false when puzzle is finished)
    puzzleFinished: false, // True when all target words in the current puzzle are found
  });

  // State to manage the user's letter selection
  const [selection, setSelection] = useState({
    isSelecting: false, // True when the user is actively dragging/selecting
    startCell: null as { row: number, col: number } | null, // The first cell selected
    endCell: null as { row: number, col: number } | null, // The last cell hovered over
    selectedCells: [] as { row: number, col: number }[] // All cells currently highlighted by selection
  });

  // State to manage cell-specific animations (e.g., found word highlight, incorrect attempt)
  const [animations, setAnimations] = useState<{ [key: string]: string }>({}); // Key: "row-col", Value: animation class

  // Ref for the game timer interval
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Audio Elements Refs ---
  // These refs hold references to HTMLAudioElement instances for playing sound effects.
  // The 'preload="auto"' attribute in JSX helps browsers load sounds proactively.
  const foundSoundRef = useRef<HTMLAudioElement | null>(null);
  const levelUpSoundRef = useRef<HTMLAudioElement | null>(null);
  const buttonClickSoundRef = useRef<HTMLAudioElement | null>(null);

  // --- Zen Quotes (Local Data - can be replaced by API) ---
  const zenQuotes = [
    "The wise potato knows when to be mashed",
    "A confused penguin still slides with purpose",
    "The loudest silence happens during breakfast",
    "When the moon sneezes, the stars say bless you",
    "A backwards clock is still right twice a day",
    "The deepest puddle reflects the shallowest thoughts",
    "A dancing refrigerator never spoils the milk",
    "The last cookie in the jar holds infinite wisdom",
    "When clouds wear socks, rain becomes comfortable",
    "A sleeping calculator dreams of perfect equations",
    "The heaviest feather carries the lightest burden",
    "A mirror without reflection still shows the truth",
    "The fastest turtle wins the race it never entered",
    "When soup gets cold, it remembers being hot",
    "A library card opens doors that have no locks",
    "The smallest giant casts the largest shadow",
    "A musical banana peels itself with rhythm",
    "The emptiest cup holds the most possibility",
    "When gravity takes a day off, everything floats with purpose",
    "A laughing mountain echoes into tomorrow"
  ];

  // Colors for the welcome screen background transitions
  const welcomeColors = [
    '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#F97316', '#06B6D4', '#84CC16'
  ];

  // Categories, themes, and word lists for puzzle generation
  // Words are expanded to provide more variety for 5-8 word puzzles.
  const categories = {
    nature: {
      name: 'Natural World',
      icon: Leaf,
      color: 'from-green-500 to-emerald-500',
      themes: [
        { name: 'Forest', words: ['TREE', 'LEAF', 'BARK', 'ROOT', 'MOSS', 'FERN', 'ACORN', 'TWIG', 'BERRY', 'LAKE', 'PINE', 'STREAM'] },
        { name: 'Ocean', words: ['WAVE', 'FISH', 'SAND', 'TIDE', 'REEF', 'KELP', 'SHELL', 'CORAL', 'SHARK', 'CRAB', 'SEAL', 'WATER'] },
        { name: 'Mountains', words: ['PEAK', 'ROCK', 'SNOW', 'CAVE', 'ECHO', 'MIST', 'CLIFF', 'TRAIL', 'VALLEY', 'SLOPE', 'SUMMIT', 'GLACIER'] },
        { name: 'Desert', words: ['SAND', 'DUNE', 'HEAT', 'OASIS', 'CACTUS', 'MIRAGE', 'SCORPION', 'SUNSET', 'CAMEL', 'ARID', 'COYOTE', 'DRY'] },
        { name: 'Garden', words: ['ROSE', 'SEED', 'BLOOM', 'SOIL', 'WATER', 'SUNNY', 'BUG', 'PEST', 'FLOWER', 'HERB', 'WEED', 'PLANT'] }
      ]
    },
    pop: {
      name: 'Pop Culture',
      icon: Music,
      color: 'from-purple-500 to-pink-500',
      themes: [
        { name: 'Movies', words: ['FILM', 'STAR', 'HERO', 'PLOT', 'SCENE', 'CAST', 'SCREEN', 'ACTOR', 'DIRECTOR', 'GENRE', 'FANTASY', 'COMEDY'] },
        { name: 'Music', words: ['SONG', 'BEAT', 'TUNE', 'BAND', 'DANCE', 'VOICE', 'RHYTHM', 'LYRIC', 'ALBUM', 'GUITAR', 'PIANO', 'MELODY'] },
        { name: 'TV Shows', words: ['SHOW', 'CAST', 'PLOT', 'DRAMA', 'LAUGH', 'WATCH', 'EPISODE', 'SERIES', 'SITCOM', 'CABLE', 'REMOTE', 'CHANNEL'] },
        { name: 'Gaming', words: ['PLAY', 'GAME', 'LEVEL', 'SCORE', 'QUEST', 'BOSS', 'PLAYER', 'WINNER', 'CONSOLE', 'ARCADE', 'JOYSTICK', 'AVATAR'] },
        { name: 'Social Media', words: ['POST', 'LIKE', 'SHARE', 'VIRAL', 'TREND', 'MEME', 'FOLLOW', 'HASHTAG', 'INFLUENCER', 'STREAM', 'FEED', 'PROFILE'] }
      ]
    },
    general: {
      name: 'General Knowledge',
      icon: Brain,
      color: 'from-blue-500 to-cyan-500',
      themes: [
        { name: 'Science', words: ['ATOM', 'CELL', 'GENE', 'WAVE', 'LIGHT', 'HEAT', 'FORCE', 'ENERGY', 'PROTON', 'NATURE', 'LAB', 'THEORY'] },
        { name: 'History', words: ['PAST', 'KING', 'WAR', 'PEACE', 'EMPIRE', 'SAGA', 'ANCIENT', 'EVENT', 'BATTLE', 'QUEEN', 'KNIGHT', 'ERA'] },
        { name: 'Geography', words: ['CITY', 'LAND', 'RIVER', 'LAKE', 'HILL', 'ROAD', 'OCEAN', 'COUNTRY', 'ISLAND', 'DESERT', 'FOREST', 'MAP'] },
        { name: 'Food', words: ['RICE', 'BREAD', 'SOUP', 'CAKE', 'FRUIT', 'MEAT', 'CHEESE', 'PASTA', 'PIZZA', 'SALAD', 'SUGAR', 'SPICE'] },
        { name: 'Sports', words: ['BALL', 'GOAL', 'TEAM', 'WIN', 'RACE', 'JUMP', 'SCORE', 'ATHLETE', 'FIELD', 'COURT', 'COACH', 'MEDAL'] }
      ]
    }
  };

  // --- Sound Playback Function ---
  // Uses useCallback for memoization to prevent unnecessary re-renders.
  const playSound = useCallback((effect: SoundEffect) => {
    if (typeof window !== 'undefined') { // Ensure running in browser environment
      try {
        switch (effect) {
          case 'found':
            if (foundSoundRef.current) {
              foundSoundRef.current.currentTime = 0; // Rewind to start for quick successive plays
              foundSoundRef.current.play();
            }
            break;
          case 'levelUp': // Used for puzzle completion
            if (levelUpSoundRef.current) {
              levelUpSoundRef.current.currentTime = 0;
              levelUpSoundRef.current.play();
            }
            break;
          case 'buttonClick':
            if (buttonClickSoundRef.current) {
              buttonClickSoundRef.current.currentTime = 0;
              buttonClickSoundRef.current.play();
            }
            break;
        }
      } catch (error) {
        console.warn("Error playing sound:", error);
      }
    }
  }, []); // Empty dependency array means this function is created once

  // --- Vibration Feedback ---
  // Uses useCallback for memoization.
  // Triggers device vibration if supported by the browser.
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []); // Empty dependency array means this function is created once

  // Pre-defined directions for word placement (8 directions)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1], // Top-left, Top, Top-right
    [0, -1],           [0, 1],  // Left, Right
    [1, -1],  [1, 0],  [1, 1]   // Bottom-left, Bottom, Bottom-right
  ];

  // --- Datamuse API Fetch Function ---
  async function fetchWordsFromDatamuse(theme: string, max: number = 12): Promise<string[]> {
    try {
      const response = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(theme)}&max=${max}`);
      const data = await response.json();
      // Filter out multi-word results and ensure uppercase, 4-8 letters
      return data
        .map((item: { word: string }) => item.word)
        .filter(function(word: string): boolean { return /^[a-zA-Z]+$/.test(word) && word.length >= 4 && word.length <= 8; })
        .map((word: string) => word.toUpperCase());
    } catch (error) {
      console.warn('Datamuse fetch failed:', error);
      return [];
    }
  }

  /**
   * Generates a new word search grid based on the selected category.
   * Now async: fetches words from Datamuse, falls back to local if needed.
   */
  const generateGrid = async (category: string) => {
    const size = 8; // Grid size is 8x8
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const categoryData = categories[category as keyof typeof categories];
    const theme = categoryData.themes[Math.floor(Math.random() * categoryData.themes.length)];

    // Try to fetch words from Datamuse
    let availableWords = await fetchWordsFromDatamuse(theme.name, 12);
    // Fallback to local words if API fails or returns too few
    if (availableWords.length < 5) {
      availableWords = theme.words as string[];
    }
    // Filter words to be 4-8 letters long as per requirements
    availableWords = (availableWords as string[]).filter(function(word: string): boolean { return word.length >= 4 && word.length <= 8; });
    // Determine number of words to place (5-8 words per puzzle)
    const numWordsToPlace = Math.min(8, Math.max(5, availableWords.length));
    let wordsToPlace: string[] = [];

    // Randomly select unique words from the available pool
    const wordsCopy = [...availableWords]; // Create a mutable copy to splice from
    while (wordsToPlace.length < numWordsToPlace && wordsCopy.length > 0) {
      const randomIndex = Math.floor(Math.random() * wordsCopy.length);
      wordsToPlace.push(wordsCopy.splice(randomIndex, 1)[0]);
    }

    const placedWords: { word: string; start: { row: number; col: number }; direction: number; found: boolean }[] = [];

    // Sort words by length (longest first) to improve placement success rate
    wordsToPlace.sort(function(a: string, b: string): number { return b.length - a.length; });

    // Attempt to place each selected word on the grid
    wordsToPlace.forEach(word => {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 200; // Increased attempts to find a suitable spot

      while (!placed && attempts < maxAttempts) {
        const direction = Math.floor(Math.random() * 8); // Random direction (0-7)
        const row = Math.floor(Math.random() * size); // Random starting row
        const col = Math.floor(Math.random() * size); // Random starting column

        if (canPlaceWord(grid, word, row, col, direction, size)) {
          placeWord(grid, word, row, col, direction);
          placedWords.push({
            word,
            start: { row, col },
            direction,
            found: false
          });
          placed = true;
        }
        attempts++;
      }
      if (!placed) {
        // Log a warning if a word couldn't be placed after many attempts
        console.warn(`Could not place word: "${word}". Skipping for this puzzle.`);
      }
    });

    // Fill any remaining empty cells with random uppercase letters
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (grid[i][j] === '') {
          grid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    return { grid, words: placedWords, theme: theme.name };
  };

  /**
   * Checks if a word can be placed at a given position and direction without conflicts.
   * Allows overlapping letters if they are identical.
   */
  const canPlaceWord = (grid: string[][], word: string, row: number, col: number, direction: number, size: number) => {
    const [dRow, dCol] = directions[direction]; // Get row and column increments for the direction

    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;

      // Check if the new position is within grid boundaries
      if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
        return false;
      }

      // Check for conflict: if cell is not empty AND the letter doesn't match
      if (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i]) {
        return false;
      }
    }
    return true; // Word can be placed
  };

  /**
   * Places a word onto the grid at the specified position and direction.
   */
  const placeWord = (grid: string[][], word: string, row: number, col: number, direction: number) => {
    const [dRow, dCol] = directions[direction]; // Get row and column increments for the direction

    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      grid[newRow][newCol] = word[i]; // Place the letter
    }
  };

  /**
   * Handles the start of a cell selection (mouse down or touch start).
   */
  const handleCellMouseDown = (row: number, col: number) => {
    if (!gameState.gameActive) return; // Only allow selection if game is active

    setSelection({
      isSelecting: true,
      startCell: { row, col },
      endCell: { row, col },
      selectedCells: [{ row, col }] // Initial selected cell is the start cell
    });
  };

  /**
   * Handles cell selection during mouse move or touch move.
   * Updates the `selectedCells` to highlight the path.
   */
  const handleCellMouseMove = (row: number, col: number) => {
    if (!selection.isSelecting || !gameState.gameActive) return; // Only if selecting and game is active

    // Optimization: only update if the current cell is different from the last end cell
    if (selection.endCell?.row === row && selection.endCell?.col === col) {
      return;
    }

    // Get all cells in the line between start and current end cell
    const cells = getCellsInLine(selection.startCell!, { row, col });
    setSelection(prev => ({
      ...prev,
      endCell: { row, col },
      selectedCells: cells
    }));
  };

  /**
   * Handles the end of a cell selection (mouse up or touch end).
   * Checks if the selected word is a target word.
   */
  const handleCellMouseUp = () => {
    if (!selection.isSelecting || !gameState.gameActive) return; // Only if selecting and game is active

    // Construct the word from the selected cells
    const selectedWord = selection.selectedCells
      .map(cell => gameState.grid[cell.row][cell.col])
      .join('');

    checkWord(selectedWord, selection.selectedCells); // Check if it's a valid word

    // Reset selection state
    setSelection({
      isSelecting: false,
      startCell: null,
      endCell: null,
      selectedCells: []
    });
  };

  /**
   * Calculates all cells in a straight or diagonal line between two points.
   * Returns only the start cell if the line is not straight or diagonal.
   */
  const getCellsInLine = (start: { row: number; col: number }, end: { row: number; col: number }) => {
    const cells: { row: number; col: number }[] = [];
    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;
    const distance = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

    if (distance === 0) return [start]; // If start and end are the same, return just the start cell

    // Check if the line is straight (horizontal/vertical) or diagonal
    if (Math.abs(rowDiff) !== Math.abs(colDiff) && rowDiff !== 0 && colDiff !== 0) {
      return [start]; // If not straight or diagonal, invalid selection, return only start
    }

    // Calculate step increments for row and column
    const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

    // Add all cells along the line
    for (let i = 0; i <= distance; i++) {
      cells.push({
        row: start.row + i * rowStep,
        col: start.col + i * colStep
      });
    }

    return cells;
  };

  /**
   * Checks if the `word` formed by `cells` is one of the `targetWords`.
   * Provides visual and audio feedback.
   */
  const checkWord = (word: string, cells: { row: number, col: number }[]) => {
    // Find the target word, checking both forward and reversed versions, and ensuring it hasn't been found yet
    const targetWordObj = gameState.targetWords.find(w =>
      (w.word === word || w.word === word.split('').reverse().join('')) && !w.found
    );

    if (targetWordObj) {
      playSound('found'); // Play sound for found word
      vibrate(100); // Vibrate for 100ms

      setGameState(prev => {
        // Mark the found word as 'found' in the targetWords list
        const updatedTargetWords = prev.targetWords.map(w =>
          w.word === targetWordObj.word ? { ...w, found: true } : w
        );
        const newScore = prev.score + targetWordObj.word.length * 15; // Calculate new score
        const allWordsFound = updatedTargetWords.every(w => w.found); // Check if all words are found

        if (allWordsFound) {
          playSound('levelUp'); // Play level up sound when puzzle is complete
          // Set puzzleFinished to true and deactivate game interaction
          return {
            ...prev,
            targetWords: updatedTargetWords,
            foundWords: [...prev.foundWords, targetWordObj.word],
            score: newScore,
            puzzleFinished: true,
            gameActive: false, // Disable grid interaction until new puzzle is started
          };
        } else {
          // If not all words found, just update found words and score
          return {
            ...prev,
            targetWords: updatedTargetWords,
            foundWords: [...prev.foundWords, targetWordObj.word],
            score: newScore
          };
        }
      });

      // Apply 'found-animating' class for a brief pulse, then 'found' for persistent highlight
      cells.forEach(cell => {
        setAnimations(prev => ({
          ...prev,
          [`${cell.row}-${cell.col}`]: 'found-animating'
        }));
        setTimeout(() => {
          setAnimations(prev => ({
            ...prev,
            [`${cell.row}-${cell.col}`]: 'found'
          }));
        }, 500); // Animation duration
      });
    } else {
      // If incorrect word, apply 'incorrect-selection' for a brief red flash
      cells.forEach(cell => {
        setAnimations(prev => ({
          ...prev,
          [`${cell.row}-${cell.col}`]: 'incorrect-selection'
        }));
        setTimeout(() => {
          setAnimations(prev => {
            const newAnims = { ...prev };
            delete newAnims[`${cell.row}-${cell.col}`]; // Remove animation class after flash
            return newAnims;
          });
        }, 300); // Flash duration
      });
    }
  };

  /**
   * Starts a new puzzle. Resets timer, score, and generates a new grid.
   * Now async: waits for grid generation.
   * @param category Optional: if provided, starts a puzzle in this category. Otherwise, uses current category.
   */
  const startNewPuzzle = useCallback(async (category: string | null = null) => {
    playSound('buttonClick'); // Play button click sound
    setGameState(prev => ({ ...prev, isLoading: true })); // Show loading spinner
    const chosenCategory = category || gameState.category;
    const { grid, words, theme } = await generateGrid(chosenCategory);
    // Stop any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Reset game state for the new puzzle
    setGameState(prev => ({
      ...prev,
      grid,
      targetWords: words,
      foundWords: [],
      theme,
      category: chosenCategory,
      isLoading: false,
      timeElapsed: 0, // Reset time for the new puzzle
      gameActive: true, // Activate grid interaction
      puzzleFinished: false, // Reset puzzle finished status
      level: prev.level + 1 // Increment level for each new puzzle
    }));
    setAnimations({}); // Clear all cell animations
    // Start the elapsed time timer
    timerRef.current = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1
      }));
    }, 1000); // Update every second
    setGamePhase('playing'); // Transition to playing phase
  }, [gameState.category, playSound]);

  /**
   * Transitions from welcome screen to category selection.
   */
  const startGame = () => {
    playSound('buttonClick');
    setGamePhase('category');
  };

  /**
   * Selects a category and starts the first puzzle in that category.
   * @param category The selected category key.
   */
  const selectCategory = async (category: string) => {
    playSound('buttonClick');
    await startNewPuzzle(category);
  };

  /**
   * Resets the game to the welcome screen.
   * Clears timer, score, and other game-specific states.
   */
  const backToWelcome = () => {
    playSound('buttonClick');
    setGamePhase('welcome');
    // Randomize welcome screen color and quote
    setWelcomeColor(welcomeColors[Math.floor(Math.random() * welcomeColors.length)]);
    setCurrentQuote(zenQuotes[Math.floor(Math.random() * zenQuotes.length)]);

    // Clear the timer if it's running
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset all game-related states
    setGameState(prev => ({
      ...prev,
      timeElapsed: 0,
      gameActive: true, // Reset to true for next game start
      puzzleFinished: false,
      score: 0,
      level: 1, // Reset level to 1
      foundWords: [],
      targetWords: [],
      grid: [] // Clear grid
    }));
  };

  /**
   * Formats seconds into MM:SS string.
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- useEffect for Initial Setup and Audio Initialization ---
  useEffect(() => {
    // Set initial welcome screen elements
    setWelcomeColor(welcomeColors[Math.floor(Math.random() * welcomeColors.length)]);
    setCurrentQuote(zenQuotes[Math.floor(Math.random() * zenQuotes.length)]);

    // Initialize HTML Audio Elements
    // IMPORTANT: Ensure these .mp3 files exist in your `public/sounds/` directory.
    // E.g., `your-project-root/public/sounds/found.mp3`
    foundSoundRef.current = new Audio('/sounds/found.mp3');
    levelUpSoundRef.current = new Audio('/sounds/levelup.mp3');
    buttonClickSoundRef.current = new Audio('/sounds/button_click.mp3');

    // Cleanup function: runs when component unmounts
    return () => {
      if (timerRef.current) clearInterval(timerRef.current); // Clear timer
      // Pause and release audio resources
      if (foundSoundRef.current) foundSoundRef.current.pause();
      if (levelUpSoundRef.current) levelUpSoundRef.current.pause();
      if (buttonClickSoundRef.current) buttonClickSoundRef.current.pause();
    };
  }, []); // Empty dependency array ensures this runs only once on component mount

  // --- useEffect for Puzzle Completion Logic ---
  // This effect runs whenever `gameState.puzzleFinished` or `gameState.gameActive` changes.
  useEffect(() => {
    if (gameState.puzzleFinished && gameState.gameActive) {
      // If puzzle is finished and game is still active (meaning it just completed)
      if (timerRef.current) {
        clearInterval(timerRef.current); // Stop the timer
        timerRef.current = null;
      }
      setGameState(prev => ({ ...prev, gameActive: false })); // Deactivate grid interaction
    }
  }, [gameState.puzzleFinished, gameState.gameActive]); // Dependencies for this effect

  // --- Conditional Rendering based on gamePhase ---

  // Welcome Screen UI
  if (gamePhase === 'welcome') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 transition-all duration-1000"
        style={{ backgroundColor: welcomeColor }} // Dynamic background color
      >
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="text-6xl mb-4">🧘‍♂️</div> {/* Zen emoji */}
            <h1 className="text-4xl font-bold text-white mb-4">Word Zen</h1>
            <p className="text-white/80 text-lg italic leading-relaxed">
              "{currentQuote}" {/* Dynamic zen quote */}
            </p>
          </div>

          <button
            onClick={startGame}
            className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-full
                     text-xl font-semibold hover:bg-white/30 transition-all duration-300
                     active:scale-95 border-2 border-white/30"
          >
            Let Go!
          </button>
        </div>
      </div>
    );
  }

  // Category Selection Screen UI
  if (gamePhase === 'category') {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 mt-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Path</h2>
            <p className="text-gray-600">Select a category to begin your word journey</p>
          </div>

          <div className="space-y-4">
            {Object.entries(categories).map(([key, category]) => {
              const IconComponent = category.icon; // Dynamic icon component from lucide-react
              return (
                <button
                  key={key}
                  onClick={() => selectCategory(key)}
                  className={`w-full bg-gradient-to-r ${category.color} p-6 rounded-xl
                           text-white shadow-lg hover:shadow-xl transition-all duration-300
                           active:scale-95 flex items-center gap-4`}
                >
                  <IconComponent size={32} />
                  <div className="text-left">
                    <h3 className="text-xl font-bold">{category.name}</h3>
                    <p className="text-white/80">
                      {category.themes.length} unique themes
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={backToWelcome}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Zen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Screen UI
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={24} className="text-gray-600" /> {/* Clock icon for elapsed time */}
              <span className="text-2xl font-bold text-gray-800">
                {formatTime(gameState.timeElapsed)} {/* Displays elapsed time */}
              </span>
            </div>
            <button
              onClick={backToWelcome}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={20} className="text-gray-600" /> {/* Reset/Back button */}
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-green-600 mb-1">
              #{gameState.level} {gameState.theme} {/* Current level and theme */}
            </h1>
            <p className="text-gray-500 text-sm">
              Level {gameState.level} • Score: {gameState.score} • {categories[gameState.category as keyof typeof categories]?.name}
            </p>
          </div>
        </div>

        {/* Loading State UI */}
        {gameState.isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating puzzle...</p>
          </div>
        )}

        {/* Game Grid UI */}
        {!gameState.isLoading && gameState.grid.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <div
              className="grid grid-flow-row gap-2 aspect-square select-none w-full max-w-sm mx-auto" // FIXED: Added w-full, max-w-sm, grid-flow-row. Removed grid-cols-8 here
              style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }} // FIXED: Explicit CSS for 8 columns
              onMouseLeave={() => selection.isSelecting && handleCellMouseUp()} // Handle mouse leaving grid while selecting
              // --- Touch Event Listeners for Mobile Drag ---
              onTouchStart={(e) => {
                if (e.touches.length === 1) { // Only process single touch
                  const touch = e.touches[0];
                  // Use elementFromPoint to find the element under the touch
                  const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                  if (element && element.dataset.row && element.dataset.col) {
                    handleCellMouseDown(parseInt(element.dataset.row, 10), parseInt(element.dataset.col, 10));
                  }
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 1 && selection.isSelecting) {
                  const touch = e.touches[0];
                  const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                  if (element && element.dataset.row && element.dataset.col) {
                    handleCellMouseMove(parseInt(element.dataset.row, 10), parseInt(element.dataset.col, 10));
                  }
                }
              }}
              onTouchEnd={handleCellMouseUp} // End selection on touch release
            >
              {/* Render each grid cell */}
              {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isSelected = selection.selectedCells.some(
                    selected => selected.row === rowIndex && selected.col === colIndex
                  );
                  const animationClass = animations[`${rowIndex}-${colIndex}`]; // Get animation state for cell

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`} // Unique key for React list rendering
                      data-row={rowIndex} // Custom data attributes for touch event targeting
                      data-col={colIndex}
                      className={`
                        aspect-square bg-gray-100 rounded-lg flex items-center justify-center
                        text-xl sm:text-2xl font-bold cursor-pointer transition-all duration-200
                        ${isSelected ? 'bg-green-200 scale-110' : ''} {/* Highlight for current selection */}
                        ${animationClass === 'found' ? 'bg-green-500 text-white' : ''} {/* Persistent highlight for found words */}
                        ${animationClass === 'found-animating' ? 'bg-yellow-300 text-gray-900 animate-pulse' : ''} {/* Sparkle/pulse animation on found */}
                        ${animationClass === 'incorrect-selection' ? 'bg-red-400 text-white' : ''} {/* Brief red flash for incorrect */}
                        ${!animationClass && !isSelected ? 'text-gray-800 hover:bg-gray-200 active:scale-95' : ''} {/* Default state */}
                      `}
                      onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                      onMouseMove={() => handleCellMouseMove(rowIndex, colIndex)}
                      onMouseUp={handleCellMouseUp}
                    >
                      {cell}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Word List UI */}
        {gameState.targetWords.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Find these words:</h3>
            <div className="flex flex-wrap gap-2">
              {gameState.targetWords.map((wordObj, index) => (
                <span
                  key={index}
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium transition-all duration-300
                    ${wordObj.found
                      ? 'bg-green-500 text-white line-through' // Strikethrough for found words
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  {wordObj.word}
                </span>
              ))}
            </div>

            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <span>Found: {gameState.foundWords.length}/{gameState.targetWords.length}</span>
              <span>{gameState.targetWords.length - gameState.foundWords.length} remaining</span>
            </div>
          </div>
        )}

        {/* Puzzle Finished UI / New Puzzle Button */}
        {gameState.puzzleFinished && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center mt-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Puzzle Solved!</h3>
            <p className="text-gray-600 mb-4">Time: {formatTime(gameState.timeElapsed)}</p>
            <button
              onClick={async () => await startNewPuzzle(null)} // Start a new puzzle in the same category
              className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold
                       hover:bg-green-600 transition-colors mr-2"
            >
              New Puzzle
            </button>
            <button
              onClick={backToWelcome}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold
                       hover:bg-gray-400 transition-colors"
            >
              Change Category
            </button>
          </div>
        )}

        {/* Hidden Audio Elements */}
        {/* Ensure these paths are correct relative to your public folder */}
        <audio ref={foundSoundRef} src="/sounds/found.mp3" preload="auto" />
        <audio ref={levelUpSoundRef} src="/sounds/levelup.mp3" preload="auto" />
        {/* Removed gameOverSoundRef as it's not used with elapsed timer logic */}
        <audio ref={buttonClickSoundRef} src="/sounds/button_click.mp3" preload="auto" />
      </div>
    </div>
  );
};

export default WordSearchGame;
