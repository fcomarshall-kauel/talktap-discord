export type Language = 'es' | 'en';

export const translations = {
  es: {
    multiplayer: {
      notConnected: "No conectado a Discord",
      yourTurn: "Tu turno",
      playerTurn: "Turno de {player}",
      participants: "Participantes",
      you: "Tú",
      waiting: "Esperando jugadores..."
    },
    app: {
      title: "¡Basta!",
      subtitle: "Di una palabra y toca su primera letra"
    },
    game: {
      category: "Categoría",
      timeRemaining: "Tiempo restante",
      tapToStart: "Toca para empezar",
      start: "EMPEZAR",
      lettersUsed: "Letras usadas",
      newRound: "Nueva Ronda",
      settings: "Configuración",
      timer: "Temporizador",
      seconds: "segundos",
      players: "jugadores"
    },
    messages: {
      newRoundStarted: "¡Nueva ronda iniciada!",
      categoryIs: "Categoría",
      letterSelected: "¡Letra \"{letter}\" seleccionada!",
      timerReset: "Temporizador reiniciado - turno del siguiente jugador",
      timeUp: "¡Se acabó el tiempo!",
      roundEnded: "Ronda terminada - nueva ronda en 3 segundos..."
    }
  },
  en: {
    multiplayer: {
      notConnected: "Not connected to Discord",
      yourTurn: "Your turn",
      playerTurn: "{player}'s turn",
      participants: "Participants",
      you: "You",
      waiting: "Waiting for players..."
    },
    app: {
      title: "Basta!",
      subtitle: "Say a word and tap its first letter"
    },
    game: {
      category: "Category",
      timeRemaining: "Time remaining",
      tapToStart: "Tap to start",
      start: "START",
      lettersUsed: "Letters used",
      newRound: "New Round",
      settings: "Settings",
      timer: "Timer",
      seconds: "seconds",
      players: "players"
    },
    messages: {
      newRoundStarted: "New Round Started!",
      categoryIs: "Category",
      letterSelected: "Letter \"{letter}\" selected!",
      timerReset: "Timer reset - next player's turn",
      timeUp: "Time's up!",
      roundEnded: "Round ended - starting new round in 3 seconds..."
    }
  }
};