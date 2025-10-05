# Система логирования изменений

## Обзор

Эта система логирования предназначена для отслеживания всех изменений в системе с полными снапшотами данных до и после изменений. Она обеспечивает полную прозрачность и возможность аудита всех действий.

## Основные возможности

### ✅ Полные снапшоты данных
- **ДО изменений** - полная информация о сущности перед изменением
- **ПОСЛЕ изменений** - полная информация о сущности после изменения
- **Связанные данные** - информация о связанных сущностях (отделы, заказы, товары)

### ✅ Перекрестное логирование
- При изменении пользователя логируется и в логах пользователя, и в логах отдела
- При изменении товара логируется и в логах товара, и в логах отдела
- Все связанные изменения отслеживаются автоматически

### ✅ Универсальная система
- Поддерживает все типы сущностей: пользователи, отделы, товары, заказы
- Единый интерфейс для всех типов логирования
- Специализированные функции для удобства использования

## Структура файлов

```
src/lib/
├── loggingSystem.ts      # Основная система логирования
├── logUserChange.ts      # Специализированное логирование пользователей
├── loggingExamples.ts    # Примеры использования
└── README_LOGGING.md     # Это руководство
```

## Как использовать

### 1. Базовое логирование

```typescript
import { logUserChange } from "@/lib/loggingSystem";

// Создание пользователя
await logUserChange({
  entityId: newUserId,
  adminId: adminId,
  action: "create",
  message: "Создан новый пользователь",
  afterData: newUserData
});

// Обновление пользователя
await logUserChange({
  entityId: userId,
  adminId: adminId,
  action: "update",
  message: "Обновлен статус пользователя",
  beforeData: oldUserData,
  afterData: newUserData
});

// Удаление пользователя
await logUserChange({
  entityId: userId,
  adminId: adminId,
  action: "delete",
  message: "Пользователь удален",
  beforeData: userDataBeforeDelete
});
```

### 2. Перекрестное логирование

```typescript
// При изменении отдела пользователя
await logUserChange({
  entityId: userId,
  adminId: adminId,
  action: "update",
  message: "Пользователь перемещен в другой отдел",
  beforeData: oldUserData,
  afterData: newUserData,
  relatedEntityType: "department", // Логируем и в отделе
  relatedEntityId: newDepartmentId
});
```

### 3. Логирование других сущностей

```typescript
import { logProductChange, logDepartmentChange, logOrderChange } from "@/lib/loggingSystem";

// Логирование товаров
await logProductChange({
  entityId: productId,
  adminId: adminId,
  action: "update",
  message: "Обновлена цена товара",
  beforeData: oldProductData,
  afterData: newProductData
});

// Логирование отделов
await logDepartmentChange({
  entityId: departmentId,
  adminId: adminId,
  action: "update",
  message: "Обновлено название отдела",
  beforeData: oldDepartmentData,
  afterData: newDepartmentData
});

// Логирование заказов
await logOrderChange({
  entityId: orderId,
  adminId: adminId,
  action: "update",
  message: "Заказ завершен",
  beforeData: oldOrderData,
  afterData: newOrderData
});
```

## Структура данных в логах

### Пользователь (snapshotBefore/snapshotAfter)
```json
{
  "id": 1,
  "phone": "+79001234567",
  "first_name": "Иван",
  "last_name": "Иванов",
  "middle_name": "Иванович",
  "role": "client",
  "status": "verified",
  "created_at": "2024-01-01T00:00:00Z",
  "department_id": 1,
  "department": {
    "id": 1,
    "name": "Отдел продаж"
  },
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

### Отдел (snapshotBefore/snapshotAfter)
```json
{
  "id": 1,
  "name": "Отдел продаж",
  "created_at": "2024-01-01T00:00:00Z",
  "users": {
    "list": [...],
    "count": 10
  },
  "products": {
    "list": [...],
    "count": 50
  },
  "orders": {
    "list": [...],
    "count": 25
  },
  "statistics": {
    "total_entities": 85,
    "active_users": 8
  }
}
```

### Товар (snapshotBefore/snapshotAfter)
```json
{
  "id": 1,
  "title": "Товар",
  "sku": "SKU123",
  "brand": "Бренд",
  "price": 1000,
  "supplier_price": 800,
  "description": "Описание",
  "image": "image.jpg",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "category_id": 1,
  "department_id": 1,
  "category": {
    "id": 1,
    "title": "Категория"
  },
  "department": {
    "id": 1,
    "name": "Отдел продаж"
  },
  "statistics": {
    "has_supplier_price": true,
    "has_image": true,
    "has_description": true,
    "days_since_update": 5
  }
}
```

## Интеграция с API

### Пример использования в API роуте

```typescript
// src/app/api/users/[userId]/route.ts
import { logUserChange } from "@/lib/loggingSystem";

export async function PUT(request: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = parseInt(params.userId);
    const adminId = getCurrentUserId(); // Получаем ID текущего пользователя
    
    // Получаем данные ДО изменений
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        clientOrders: true,
        managerOrders: true,
      },
    });

    // Обновляем пользователя
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        department: true,
        clientOrders: true,
        managerOrders: true,
      },
    });

    // Логируем изменение
    await logUserChange({
      entityId: userId,
      adminId: adminId,
      action: "update",
      message: "Пользователь обновлен через API",
      beforeData: userBefore,
      afterData: updatedUser,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Ошибка при обновлении пользователя:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
```

## Лучшие практики

### 1. Всегда собирайте полные данные
```typescript
// ✅ Правильно - собираем полные данные
const userBefore = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    department: true,
    clientOrders: true,
    managerOrders: true,
  },
});

// ❌ Неправильно - только основные поля
const userBefore = await prisma.user.findUnique({
  where: { id: userId },
});
```

### 2. Используйте перекрестное логирование
```typescript
// ✅ Правильно - логируем связанные изменения
await logUserChange({
  entityId: userId,
  adminId: adminId,
  action: "update",
  message: "Пользователь перемещен в отдел",
  beforeData: userBefore,
  afterData: userAfter,
  relatedEntityType: "department",
  relatedEntityId: newDepartmentId,
});
```

### 3. Добавляйте понятные сообщения
```typescript
// ✅ Правильно - понятное сообщение
message: "Пользователь перемещен из отдела 'Продажи' в отдел 'Маркетинг'"

// ❌ Неправильно - непонятное сообщение
message: "Updated"
```

### 4. Обрабатывайте ошибки
```typescript
try {
  await logUserChange({
    entityId: userId,
    adminId: adminId,
    action: "update",
    message: "Обновление пользователя",
    beforeData: userBefore,
    afterData: userAfter,
  });
} catch (error) {
  console.error("Ошибка при логировании:", error);
  // Не прерываем основную операцию из-за ошибки логирования
}
```

## Мониторинг и отладка

### Просмотр логов в базе данных

```sql
-- Посмотреть все логи пользователей
SELECT * FROM UserLog ORDER BY createdAt DESC;

-- Посмотреть логи конкретного пользователя
SELECT * FROM UserLog WHERE targetUserId = 123 ORDER BY createdAt DESC;

-- Посмотреть логи конкретного администратора
SELECT * FROM UserLog WHERE adminId = 456 ORDER BY createdAt DESC;

-- Посмотреть логи за определенный период
SELECT * FROM UserLog 
WHERE createdAt BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY createdAt DESC;
```

### Анализ изменений

```typescript
// Получить историю изменений пользователя
const userLogs = await prisma.userLog.findMany({
  where: { targetUserId: userId },
  orderBy: { createdAt: 'desc' },
  include: {
    admin: {
      select: { first_name: true, last_name: true }
    }
  }
});

// Анализировать изменения
userLogs.forEach(log => {
  const before = JSON.parse(log.snapshotBefore || '{}');
  const after = JSON.parse(log.snapshotAfter || '{}');
  
  console.log(`Изменение от ${log.admin.first_name} ${log.admin.last_name}:`);
  console.log(`До: ${before.status}, После: ${after.status}`);
});
```

## Расширение системы

### Добавление нового типа сущности

1. Добавьте новый тип в `EntityType`
2. Создайте функцию `getFull[Entity]Data()`
3. Добавьте логику в `logEntityChange()`
4. Создайте специализированную функцию `log[Entity]Change()`

### Пример для категорий

```typescript
// В loggingSystem.ts
type EntityType = "user" | "department" | "product" | "order" | "category";

async function getFullCategoryData(categoryId: number) {
  // Реализация сбора полных данных категории
}

// В logEntityChange()
else if (options.entityType === "category" && options.entityId) {
  snapshotAfter = options.afterData || (await getFullCategoryData(options.entityId));
}

export async function logCategoryChange(options: Omit<UniversalLogOptions, "entityType">) {
  return logEntityChange({
    ...options,
    entityType: "category",
  });
}
```

## Производительность

### Оптимизация запросов

1. **Используйте индексы** в базе данных для полей `adminId`, `targetUserId`, `createdAt`
2. **Ограничивайте выборку** связанных данных только необходимыми полями
3. **Кэшируйте данные** администратора, если он не меняется часто

### Мониторинг производительности

```typescript
// Добавьте метрики времени выполнения
const startTime = Date.now();
await logUserChange(options);
const endTime = Date.now();
console.log(`Логирование заняло ${endTime - startTime}ms`);
```

## Безопасность

### Проверка прав доступа

```typescript
// Всегда проверяйте права перед логированием
if (!hasPermission(userId, 'edit_users')) {
  throw new Error('Недостаточно прав для редактирования пользователей');
}

await logUserChange({
  entityId: userId,
  adminId: currentUserId,
  action: "update",
  // ...
});
```

### Валидация данных

```typescript
// Проверяйте корректность данных перед логированием
if (!beforeData || !afterData) {
  console.warn('Отсутствуют данные для логирования');
  return;
}
```

## Заключение

Эта система логирования обеспечивает полную прозрачность всех изменений в системе. Она позволяет:

- ✅ Отслеживать кто, когда и что изменил
- ✅ Восстанавливать данные при необходимости
- ✅ Проводить аудит и анализ изменений
- ✅ Обеспечивать безопасность и подотчетность

Используйте эту систему для всех критически важных операций в вашем приложении! 