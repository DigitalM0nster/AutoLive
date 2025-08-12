# Универсальная система логирования с полными снапшотами

## 🎯 Принципы новой системы

### ✅ Полные снапшоты данных
- **snapshotBefore** - полный объект ДО изменений
- **snapshotAfter** - полный объект ПОСЛЕ изменений  
- **adminSnapshot** - полный снапшот администратора (кто совершил действие)

### ✅ Универсальная структура
- Одна таблица `ChangeLog` для всех типов сущностей
- Никаких избыточных полей и связей
- Все данные сохраняются в снапшотах

### ✅ Специфичные снапшоты
- Каждая сущность имеет свою структуру снапшота
- Пользователь: полная информация + заявки + статистика
- Товар: полная информация + категория + отдел
- Отдел: полная информация + пользователи + товары + заявки
- Заявка: полная информация + клиент + менеджер + отдел

## 📊 Структура данных

### Модель ChangeLog
```sql
CREATE TABLE change_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    created_at DATETIME DEFAULT NOW(),
    
    -- Тип сущности
    entity_type VARCHAR(50), -- "user", "department", "product", "order"
    
    -- Сообщение о том, что произошло
    message TEXT,
    
    -- ПОЛНЫЕ снапшоты данных
    snapshot_before JSON, -- Полный объект ДО изменений
    snapshot_after JSON,  -- Полный объект ПОСЛЕ изменений
    admin_snapshot JSON,  -- Полный снапшот администратора
    
    -- Для быстрого поиска (опционально)
    entity_id INT,
    admin_id INT,
    department_id INT
);
```

## 🔧 Использование

### Базовое логирование
```typescript
import { logUserChange } from "@/lib/universalLogging";

// Создание пользователя
await logUserChange({
    entityId: newUserId,
    adminId: adminId,
    message: "Создан новый пользователь",
    afterData: newUserData
});

// Обновление пользователя
await logUserChange({
    entityId: userId,
    adminId: adminId,
    message: "Комплексное обновление: статус, отдел, роль",
    beforeData: oldUserData,
    afterData: newUserData
});

// Удаление пользователя
await logUserChange({
    entityId: userId,
    adminId: adminId,
    message: "Пользователь удален",
    beforeData: userDataBeforeDelete
});
```

### Логирование других сущностей
```typescript
import { logDepartmentChange, logProductChange, logOrderChange } from "@/lib/universalLogging";

// Отдел
await logDepartmentChange({
    entityId: departmentId,
    adminId: adminId,
    message: "Обновлено название отдела",
    beforeData: oldDepartmentData,
    afterData: newDepartmentData
});

// Товар
await logProductChange({
    entityId: productId,
    adminId: adminId,
    message: "Изменена цена и отдел товара",
    beforeData: oldProductData,
    afterData: newProductData
});

// Заявка
await logOrderChange({
    entityId: orderId,
    adminId: adminId,
    message: "Заявка завершена",
    beforeData: oldOrderData,
    afterData: newOrderData
});
```

## 📈 Анализ и восстановление

### Анализ изменений
```typescript
// Получаем все изменения пользователя
const userLogs = await prisma.changeLog.findMany({
    where: { 
        entityType: "user",
        entityId: userId 
    },
    orderBy: { createdAt: 'desc' }
});

// Анализируем каждое изменение
userLogs.forEach(log => {
    const before = JSON.parse(log.snapshotBefore || '{}');
    const after = JSON.parse(log.snapshotAfter || '{}');
    const admin = JSON.parse(log.adminSnapshot || '{}');
    
    console.log(`Изменение от ${admin.first_name} ${admin.last_name}:`);
    console.log(`Статус: ${before.status} → ${after.status}`);
    console.log(`Отдел: ${before.department?.name} → ${after.department?.name}`);
});
```

### Восстановление данных
```typescript
// Восстанавливаем данные пользователя на определенную дату
const lastLog = await prisma.changeLog.findFirst({
    where: {
        entityType: "user",
        entityId: userId,
        createdAt: { lte: targetDate }
    },
    orderBy: { createdAt: 'desc' }
});

const userData = JSON.parse(lastLog.snapshotAfter || lastLog.snapshotBefore || '{}');
console.log("Восстановленные данные:", userData);
```

## 🎯 Преимущества новой системы

### 1. Полная сохранность данных
- Даже если администратор удален, у нас есть полный снапшот
- Даже если отдел удален, у нас есть полная информация о нем
- Никаких потерь данных

### 2. Универсальность
- Одна система для всех типов сущностей
- Единый интерфейс
- Простота использования

### 3. Специфичные снапшоты
- Каждая сущность имеет свою структуру данных
- Все связанные данные включены в снапшот
- Полная информация для анализа

### 4. Простота анализа
- Все данные в одном месте
- Легко анализировать изменения
- Простое восстановление данных

## 🔄 Миграция со старой системы

### Старая система (UserLog)
```typescript
// Старый способ - много избыточных полей
await prisma.userLog.create({
    data: {
        action: "update",
        adminId: adminId,
        targetUserId: userId,
        departmentId: departmentId,
        message: "Обновлен пользователь",
        snapshotBefore: JSON.stringify(beforeData),
        snapshotAfter: JSON.stringify(afterData),
        adminSnapshot: JSON.stringify(adminData),
        userId: adminId, // Дублирование!
    }
});
```

### Новая система (ChangeLog)
```typescript
// Новый способ - только нужные данные
await prisma.changeLog.create({
    data: {
        entityType: "user",
        message: "Обновлен пользователь",
        snapshotBefore: JSON.stringify(beforeData),
        snapshotAfter: JSON.stringify(afterData),
        adminSnapshot: JSON.stringify(adminData),
        entityId: userId,
        adminId: adminId,
        departmentId: departmentId,
    }
});
```

## 📋 Чек-лист внедрения

- [ ] Создать миграцию для таблицы `ChangeLog`
- [ ] Обновить клиент Prisma (`npx prisma generate`)
- [ ] Заменить старые вызовы логирования на новые
- [ ] Протестировать создание, обновление и удаление
- [ ] Протестировать анализ и восстановление данных
- [ ] Удалить старые таблицы логов (после миграции данных)

## 🚀 Следующие шаги

1. **Создать миграцию** для новой таблицы
2. **Обновить клиент Prisma** для работы с новой схемой
3. **Заменить старые вызовы** логирования на новые
4. **Протестировать** все сценарии использования
5. **Документировать** API для команды разработки 