# FiltersBlock

Переиспользуемый компонент для отображения фильтров, поиска и кнопки сброса.

## Использование

```tsx
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";

// Создаем массив активных фильтров
const activeFilters: ActiveFilter[] = [
  {
    key: "status",
    label: "Статус",
    value: "Подтверждён"
  },
  {
    key: "role", 
    label: "Роль",
    value: "Администратор"
  }
];

// Функция для сброса фильтров
const resetFilters = () => {
  // Логика сброса фильтров
};

// В компоненте
<FiltersBlock
  activeFilters={activeFilters}
  onResetFilters={resetFilters}
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Поиск по имени..."
  showSearch={true}
/>
```

## Пропсы

| Проп | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `activeFilters` | `ActiveFilter[]` | Да | Массив активных фильтров |
| `onResetFilters` | `() => void` | Да | Функция для сброса фильтров |
| `searchValue` | `string` | Нет | Значение поля поиска |
| `onSearchChange` | `(value: string) => void` | Нет | Обработчик изменения поиска |
| `searchPlaceholder` | `string` | Нет | Плейсхолдер для поля поиска |
| `showSearch` | `boolean` | Нет | Показывать ли поле поиска |
| `disabled` | `boolean` | Нет | Отключить ли компонент |
| `className` | `string` | Нет | Дополнительные CSS классы |

## Типы

```tsx
interface ActiveFilter {
  key: string;      // Уникальный ключ фильтра
  label: string;    // Название фильтра
  value: string;    // Значение фильтра
}
```

## Особенности

- Автоматически показывает/скрывает блок активных фильтров
- Кнопка сброса отключается, когда нет активных фильтров
- Поддерживает поиск с кастомным плейсхолдером
- Адаптивный дизайн для мобильных устройств
- Анимации при наведении и клике 