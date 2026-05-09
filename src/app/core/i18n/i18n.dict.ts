export type Lang = 'en' | 'ru';

export type Dict = Record<string, string>;

export const DICT_EN: Dict = {
  // Search page
  'items.search.title': 'Items search',
  'items.search.subtitle': 'Type at least 2 characters to search',
  'items.search.placeholder': 'e.g. lab, salewa, ai-2...',
  'items.search.idle': 'Start typing to see results…',
  'items.search.loading': 'Loading…',
  'items.search.empty': 'Nothing found',
  'items.search.errorTitle': 'Request failed',


  'items.details.sizeLabel': 'Size',
  'items.details.idLabel': 'ID',
  'items.details.priceLabel': 'Price',
  'items.details.notFoundTitle': 'Not Found',
  'items.details.unknownId':'Unknown ID',

  // History
  'history.title': 'Recently viewed',
  'history.clear': 'Clear',

  // Profile
  'profile.title': 'Profile',
  'profile.titleAuth': '{name}’s watchlist',
  'profile.subtitle': 'Manage tracked catalog items.',
  'profile.signInNote': 'Sign in to use protected backend routes. Local watchlist works offline.',
  'profile.empty': 'Your watchlist is empty',
  'profile.goToSearch': 'Go to search',
  'profile.searchPlaceholder': 'Search watchlist by name…',
  'profile.filtered.empty': 'No items match the current filter',
  'profile.row.price': 'Price',
  'profile.games.all': 'All games',
  'profile.games.tarkov': 'Tarkov',
  'profile.games.warframe': 'Warframe',
  'profile.games.eve': 'EVE Online',
  'profile.actions.settings': 'Settings',
  'profile.actions.logout': 'Logout',
  'profile.avg24h': 'Price',

  // Settings
  'settings.title': 'Settings',
  'settings.subtitle': 'Preferences are stored locally on this device.',
  'settings.language': 'App language',
  'settings.appLanguage': 'App language',
  'settings.appLanguage.hint': 'Interface language',
  'settings.searchLanguage': 'Search language',
  'settings.searchLanguage.hint': 'Localization for catalog search results',
  'settings.searchLanguage.auto': 'Auto',
  'settings.tarkovMode': 'Tarkov mode',
  'settings.tarkovMode.hint': 'Affects pricing for Tarkov items only',
  'settings.mode': 'Mode',
  'settings.mode.pvp': 'PvP',
  'settings.mode.pve': 'PvE',
  'settings.account': 'Account',
  'settings.adminPanel': 'Admin panel',
  'settings.adminPanel.hint': 'Manage catalog, prices, users',
  'settings.clearWatchlist': 'Clear watchlist',
  'settings.clearWatchlist.hint': '{count} tracked locally',
  'settings.clearWatchlist.confirm': 'Clear your entire watchlist?',
  'settings.logout': 'Logout',
  'settings.logout.hint': 'Sign out of this device',
  'settings.signIn': 'Sign in',
  'settings.signIn.hint': 'Required for protected backend routes',

  // Common
  'common.back': 'Back',
  'common.profile': 'Profile',
};

export const DICT_RU: Dict = {
  // Search page
  'items.search.title': 'Поиск предметов',
  'items.search.subtitle': 'Введите минимум 2 символа для поиска',
  'items.search.placeholder': 'например: lab, salewa, ai-2...',
  'items.search.idle': 'Начните вводить, чтобы увидеть результаты…',
  'items.search.loading': 'Загрузка…',
  'items.search.empty': 'Ничего не найдено',
  'items.search.errorTitle': 'Ошибка запроса',

  'items.details.sizeLabel': 'Размер',

  // History
  'history.title': 'Недавно просмотренные',
  'history.clear': 'Очистить',

  // Profile
  'profile.title': 'Профиль',
  'profile.titleAuth': 'Список {name}',
  'profile.subtitle': 'Управление отслеживаемыми предметами.',
  'profile.signInNote': 'Войдите, чтобы использовать защищённые маршруты бэкенда. Локальный список работает оффлайн.',
  'profile.empty': 'Ваш список пуст',
  'profile.goToSearch': 'Перейти к поиску',
  'profile.searchPlaceholder': 'Поиск по списку…',
  'profile.filtered.empty': 'Нет предметов под текущий фильтр',
  'profile.row.price': 'Цена',
  'profile.games.all': 'Все игры',
  'profile.games.tarkov': 'Tarkov',
  'profile.games.warframe': 'Warframe',
  'profile.games.eve': 'EVE Online',
  'profile.actions.settings': 'Настройки',
  'profile.actions.logout': 'Выйти',
  'profile.avg24h': 'Цена',

  // Settings
  'settings.title': 'Настройки',
  'settings.subtitle': 'Настройки сохраняются локально на этом устройстве.',
  'settings.language': 'Язык приложения',
  'settings.appLanguage': 'Язык приложения',
  'settings.appLanguage.hint': 'Язык интерфейса',
  'settings.searchLanguage': 'Язык поиска',
  'settings.searchLanguage.hint': 'Локализация результатов поиска по каталогу',
  'settings.searchLanguage.auto': 'Авто',
  'settings.tarkovMode': 'Режим Tarkov',
  'settings.tarkovMode.hint': 'Влияет только на цены предметов из Tarkov',
  'settings.mode': 'Режим',
  'settings.mode.pvp': 'PvP',
  'settings.mode.pve': 'PvE',
  'settings.account': 'Аккаунт',
  'settings.adminPanel': 'Админ-панель',
  'settings.adminPanel.hint': 'Управление каталогом, ценами, пользователями',
  'settings.clearWatchlist': 'Очистить список',
  'settings.clearWatchlist.hint': 'Отслеживается локально: {count}',
  'settings.clearWatchlist.confirm': 'Очистить весь список отслеживаемых?',
  'settings.logout': 'Выйти',
  'settings.logout.hint': 'Выйти из аккаунта на этом устройстве',
  'settings.signIn': 'Войти',
  'settings.signIn.hint': 'Требуется для защищённых маршрутов бэкенда',

  // Common
  'common.back': 'Назад',
  'common.profile': 'Профиль',
};
