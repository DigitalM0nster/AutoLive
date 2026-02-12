# Универсальная система логирования с полными снапшотами

## Обзор

Система логирования предназначена для отслеживания всех изменений в системе с полными снапшотами данных до и после изменений. Обеспечивает прозрачность, аудит и возможность восстановления данных.

**Главная цель:** не терять информацию о действиях, даже если связанные сущности (пользователь, отдел, запись и т.д.) потом удалены, и корректно отображать её в истории.

**Как достигается:**
- При любом изменении сохраняем полные снапшоты всех связанных сущностей
- При отображении истории — все данные берём только из снапшотов, не из БД

---

## Файловая структура

```
src/lib/
├── universalLogging.ts     # Основная система логирования (user, department, product, order)
├── crossLogging.ts         # Перекрёстное логирование записей и заказов (Booking ↔ Order)
└── README_UNIVERSAL_LOGGING.md
```

---

## Принципы системы

### Полные снапшоты данных

- **snapshotBefore** — полный объект сущности ДО изменений
- **snapshotAfter** — полный объект сущности ПОСЛЕ изменений
- **adminSnapshot** — полный снапшот администратора (кто совершил действие)

**Зачем снапшоты, а не ссылки на ID:**
- Если администратор или отдел удалены — данные сохраняются в снапшоте
- Нет зависимости от актуальных данных в БД
- Можно восстановить состояние на любую дату

### Сохранение удалённых объектов

**При удалении сущности — всегда сохраняем полный снапшот в `snapshotBefore`:**
- Удалённый пользователь, отдел, товар, запись и т.д. — вся информация остаётся в логе
- `snapshotAfter` для удаления — пустой (null)

**В связанных сущностях — информация только из снапшотов:**
- Если в логе заказа был менеджер, а менеджера потом удалили — ФИО и данные берём из `adminSnapshot` / `managerSnapshot`, а не из БД
- Если в логе отдела был пользователь, а пользователя удалили — данные о нём берём из `removedUsers[].user` в снапшоте
- **Никогда не дёргаем БД** для отображения удалённой сущности в истории — всё уже есть в снапшоте

### Универсальная структура ChangeLog

- Одна таблица `ChangeLog` для сущностей: user, department, product, order, category
- Поле `entityType` определяет тип сущности
- Поле `actions` (JSON) — массив типов действий для детализации

### Таблицы логов в проекте

| Таблица       | Назначение                                    | Сущности                 |
|---------------|-----------------------------------------------|--------------------------|
| ChangeLog     | Универсальная для основных сущностей          | user, department, product, order, category |
| product_log   | Специализированная для товаров (совместимость)| product                  |
| OrderLog      | Логи заказов                                  | order                    |
| BookingLog    | Логи записей на сервис                        | booking                  |

---

## Типы действий (actions)

### Пользователи (UserAction)
- `create` — создание пользователя
- `update` — обновление (в т.ч. смена отдела, роли, статуса)
- `delete` — удаление пользователя

### Отделы (DepartmentAction)
- `change_name` — изменение названия
- `add_employees` — добавление сотрудников
- `remove_employees` — удаление сотрудников
- `change_categories` — изменение разрешённых категорий
- `create_department` — создание отдела
- `delete_department` — удаление отдела

---

## Перекрёстное логирование

При изменении связанной сущности логи создаются **в нескольких местах**, чтобы историю можно было посмотреть с любой стороны.

### 1. Пользователь ↔ Отдел (universalLogging)

**При изменении пользователя (смена отдела, удаление):**

```
logUserChange()                    → лог в ChangeLog (entityType: "user")
logDepartmentChangeWithUsers()     → лог в ChangeLog (entityType: "department")
```

**Сценарии:**
- Пользователь добавлен в отдел → лог пользователя + лог отдела (add_employees)
- Пользователь удалён из отдела → лог пользователя + лог старого отдела (remove_employees)
- Пользователь переведён из отдела A в B → лог пользователя + лог отдела A (remove) + лог отдела B (add)
- Пользователь удалён → лог пользователя + лог отдела (remove_employees)

**При изменении отдела (добавление/удаление сотрудников):**

```
logUserChange() для каждого пользователя   → лог в ChangeLog (entityType: "user")
logDepartmentChangeWithUsers()             → лог в ChangeLog (entityType: "department")
```

### 2. Запись ↔ Заказ ↔ Отдел записи (crossLogging.ts)

Используются отдельные таблицы: `BookingLog`, `OrderLog`.

**При изменении адреса отдела записи (BookingDepartment):**

```
logBookingDepartmentChangeCrossLogging()
  → для каждой связанной записи: лог в BookingLog
  → для каждого связанного заказа: лог в OrderLog
```

**При изменении записи (Booking):**

```
logBookingChangeCrossLogging()
  → если есть связанный заказ: лог в OrderLog
```

**При удалении записи:**

```
logBookingDeleteCrossLogging()
  → если есть связанный заказ: лог в OrderLog с информацией об удалённой записи
```

---

## Структура снапшотов

### Пользователь (snapshotBefore / snapshotAfter)
```json
{
  "id": 1,
  "phone": "+79001234567",
  "first_name": "Иван",
  "last_name": "Иванов",
  "middle_name": "Иванович",
  "role": "client",
  "status": "verified",
  "createdAt": "2024-01-01T00:00:00Z",
  "departmentId": 1,
  "department": { "id": 1, "name": "Отдел продаж" },
  "orders": {
    "as_client": [...],
    "as_manager": [...],
    "total_as_client": 5,
    "total_as_manager": 2
  },
  "statistics": {
    "total_orders": 7,
    "verified": true,
    "account_age_days": 30
  }
}
```

### Отдел (snapshotBefore / snapshotAfter)

Для отделов с `logDepartmentChangeWithUsers` в `snapshotAfter` могут быть дополнительные поля:

```json
{
  "id": 1,
  "name": "Отдел продаж",
  "createdAt": "2024-01-01T00:00:00Z",
  "users": [...],
  "usersCount": 10,
  "products": { "list": [...], "count": 50 },
  "orders": { "list": [...], "count": 25 },
  "statistics": { "total_entities": 85, "active_users": 8 },
  "addedUsers": [
    {
      "user": {...},
      "previousDepartment": null,
      "currentDepartment": {...},
      "addedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "removedUsers": [
    {
      "user": {...},
      "previousDepartment": {...},
      "currentDepartment": null,
      "removedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Товар (snapshotBefore / snapshotAfter)
```json
{
  "id": 1,
  "title": "Товар",
  "sku": "SKU123",
  "brand": "Бренд",
  "price": 1000,
  "supplierPrice": 800,
  "description": "Описание",
  "image": "image.jpg",
  "categoryId": 1,
  "departmentId": 1,
  "category": { "id": 1, "title": "Категория" },
  "department": { "id": 1, "name": "Отдел продаж" },
  "productFilterValues": [...],
  "statistics": {
    "has_supplier_price": true,
    "has_image": true,
    "days_since_update": 5
  }
}
```

### Администратор (adminSnapshot)
```json
{
  "id": 5,
  "phone": "+79001111111",
  "first_name": "Админ",
  "last_name": "Иванов",
  "role": "admin",
  "status": "verified",
  "department": { "id": 1, "name": "Отдел продаж" },
  "orders": {...},
  "statistics": {...}
}
```

---

## Использование

### Базовое логирование
```typescript
import { logUserChange } from "@/lib/universalLogging";

// Создание пользователя
await logUserChange({
  entityId: newUserId,
  adminId: adminId,
  message: "Создан новый пользователь",
  afterData: newUserData,
});

// Обновление пользователя
await logUserChange({
  entityId: userId,
  adminId: adminId,
  message: "Обновлен статус пользователя",
  beforeData: oldUserData,
  afterData: newUserData,
  actions: ["update"],
});

// Удаление пользователя
await logUserChange({
  entityId: userId,
  adminId: adminId,
  message: "Пользователь удален",
  beforeData: userDataBeforeDelete,
  actions: ["delete"],
});
```

### Логирование отдела с информацией о сотрудниках
```typescript
import { logDepartmentChangeWithUsers, getFullDepartmentData } from "@/lib/universalLogging";

// Добавление пользователя в отдел
await logDepartmentChangeWithUsers({
  entityId: departmentId,
  adminId: adminId,
  message: `Пользователь ${user.phone} добавлен в отдел ${department.name}`,
  beforeData: departmentBeforeSnapshot,
  afterData: departmentAfterSnapshot,
  actions: ["add_employees"],
  addedUsers: [
    {
      user: updatedUser,
      previousDepartment: null,
      currentDepartment: department,
    },
  ],
});

// Удаление пользователя из отдела
await logDepartmentChangeWithUsers({
  entityId: departmentId,
  adminId: adminId,
  message: `Пользователь ${user.phone} удален из отдела ${department.name}`,
  beforeData: departmentBeforeSnapshot,
  afterData: null,
  actions: ["remove_employees"],
  removedUsers: [
    {
      user: user,
      previousDepartment: department,
      currentDepartment: null,
    },
  ],
});
```

### Товары и заказы
```typescript
import { logProductChange, logOrderChange } from "@/lib/universalLogging";

await logProductChange({
  entityId: productId,
  adminId: adminId,
  message: "Изменена цена товара",
  beforeData: oldProductData,
  afterData: newProductData,
});

await logOrderChange({
  entityId: orderId,
  adminId: adminId,
  message: "Заказ завершен",
  beforeData: oldOrderData,
  afterData: newOrderData,
});
```

### Перекрёстное логирование записей (crossLogging)
```typescript
import {
  logBookingDepartmentChangeCrossLogging,
  logBookingChangeCrossLogging,
  logBookingDeleteCrossLogging,
} from "@/lib/crossLogging";

// При изменении адреса отдела записи
await logBookingDepartmentChangeCrossLogging(
  bookingDepartmentId,
  oldAddress,
  newAddress,
  adminSnapshot
);

// При изменении записи (создаётся лог в связанном заказе)
await logBookingChangeCrossLogging(
  bookingId,
  bookingSnapshotBefore,
  bookingSnapshotAfter,
  adminSnapshot,
  departmentSnapshot,
  managerSnapshot
);

// При удалении записи
await logBookingDeleteCrossLogging(
  bookingId,
  deletedBookingSnapshot,
  adminSnapshot,
  departmentSnapshot
);
```

---

## API для получения логов

| Endpoint | Описание | Источник данных |
|----------|----------|-----------------|
| `GET /api/users/:userId/logs` | Логи пользователя | ChangeLog |
| `GET /api/users/logs` | Все логи пользователей | ChangeLog |
| `GET /api/departments/:departmentId/logs` | Логи отдела | ChangeLog |
| `GET /api/departments/logs` | Все логи отделов | ChangeLog |
| `GET /api/products/:productId/logs` | Логи товара | product_log |
| `GET /api/products/logs` | Все логи товаров | product_log |
| `GET /api/orders/:orderId/logs` | Логи заказа | OrderLog |
| `GET /api/orders/logs` | Все логи заказов | OrderLog |
| `GET /api/bookings/logs` | Все логи записей | BookingLog |
| `GET /api/booking-departments/:id/logs` | Логи отдела записей | BookingLog |
| `GET /api/categories/:categoryId/logs` | Логи категории | ChangeLog |

---

## Автоматический сбор снапшотов

Если не передать `beforeData` / `afterData`, система попытается собрать их сама:

```typescript
// Для update — автоматически получит snapshotBefore из БД
await logUserChange({
  entityId: userId,
  adminId: adminId,
  message: "Обновление",
  // beforeData и afterData не указаны — будут запрошены через getFullUserData()
});
```

Экспортируемые хелперы для ручного сбора:
- `getFullDepartmentData(departmentId)` — полный снапшот отдела

---

## Лучшие практики

### 1. Всегда собирайте полные данные
```typescript
// ✅ Правильно — включаем связанные данные
const userBefore = await prisma.user.findUnique({
  where: { id: userId },
  include: { department: true, clientOrders: true, managerOrders: true },
});

// ❌ Неправильно — только основные поля
const userBefore = await prisma.user.findUnique({ where: { id: userId } });
```

### 2. Используйте перекрёстное логирование
При изменении пользователя (смена отдела) — всегда логируйте и `logUserChange`, и `logDepartmentChangeWithUsers` для обоих отделов.

### 3. Понятные сообщения
```typescript
// ✅ Правильно
message: "Пользователь перемещен из отдела 'Продажи' в отдел 'Маркетинг'"

// ❌ Неправильно
message: "Updated"
```

### 4. Обрабатывайте ошибки
```typescript
try {
  await logUserChange({ ... });
} catch (error) {
  console.error("Ошибка при логировании:", error);
  // Не прерываем основную операцию из-за ошибки логирования
}
```

### 5. departmentId
Можно явно указать `departmentId`, если он отличается от отдела администратора (например, при действиях над чужим отделом).

### 6. Отображение логов — только из снапшотов
При показе истории в админке **данные для отображения** (ФИО, роль, отдел и т.д.) берите только из снапшота:

```typescript
// ✅ Правильно — берём из снапшота
const adminName = log.adminSnapshot?.first_name + " " + log.adminSnapshot?.last_name;
const managerName = log.managerSnapshot?.first_name + " " + log.managerSnapshot?.last_name;

// ❌ Неправильно — менеджера могли удалить, запрос вернёт null
const manager = await prisma.user.findUnique({ where: { id: log.managerId } });
const managerName = manager?.first_name; // информация потеряна, если удалён
```

Проверка существования в БД (`checkUsersExistence` и т.п.) допустима **только для UX**: решить, показывать ли кликабельную ссылку «Профиль» или текст «Пользователь удалён». ФИО и другие данные для отображения — всегда из снапшота.

---

## Анализ и восстановление

### Анализ изменений
```typescript
const userLogs = await prisma.changeLog.findMany({
  where: { entityType: "user", entityId: userId },
  orderBy: { createdAt: "desc" },
});

userLogs.forEach((log) => {
  const before = log.snapshotBefore as object;
  const after = log.snapshotAfter as object;
  const admin = log.adminSnapshot as { first_name: string; last_name: string };
  console.log(`От ${admin.first_name} ${admin.last_name}:`, before, "→", after);
});
```

### Восстановление данных на дату
```typescript
const lastLog = await prisma.changeLog.findFirst({
  where: {
    entityType: "user",
    entityId: userId,
    createdAt: { lte: targetDate },
  },
  orderBy: { createdAt: "desc" },
});

const userData = lastLog?.snapshotAfter ?? lastLog?.snapshotBefore ?? {};
// userData — состояние пользователя на targetDate
```

---

## Расширение системы

### Добавление нового типа сущности

1. Добавить тип в `EntityType` в `universalLogging.ts`
2. Создать функцию `getFull[Entity]Data(entityId)`
3. Добавить ветку в `logChange()` для автосбора снапшотов
4. Создать специализированную функцию `log[Entity]Change()`

---

## Модель ChangeLog (Prisma)

```prisma
model ChangeLog {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())

  entityType String   // "user", "department", "product", "order", "category"
  message    String?

  snapshotBefore Json?  // Полный объект ДО изменений
  snapshotAfter  Json?  // Полный объект ПОСЛЕ изменений
  adminSnapshot  Json?  // Полный снапшот администратора

  actions Json?  // ["add_employees", "change_name", ...]

  entityId     Int?
  adminId      Int?
  departmentId Int?
}
```
