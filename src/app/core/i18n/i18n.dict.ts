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

  'profile.title': 'Profile',
  'profile.subtitle': 'Locally saved items',
  'profile.avg24h': 'Price',
  'profile.empty': 'Your list is empty',
  'profile.goToSearch': 'Go to search',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'App language',
  'settings.mode': 'Mode',
  'settings.mode.pvp': 'PvP',
  'settings.mode.pve': 'PvE',

  // Common
  'common.back': 'Back',
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

  // Settings
  'settings.title': 'Настройки',
  'settings.language': 'Язык приложения',
  'settings.mode': 'Режим',
  'settings.mode.pvp': 'PvP',
  'settings.mode.pve': 'PvE',

  // Common
  'common.back': 'Назад',
};
