// Игнорируем фоновые ошибки самого приложения
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

// Генерируем ТОЛЬКО БУКВЫ для имени, чтобы пройти любую строгую валидацию (без цифр!)
const generateLetters = (len) => {
  let res = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {
  const uniqueStr = generateLetters(6); // Только случайные буквы!
  const uniqueNum = Math.floor(Math.random() * 1000000); // А для логина и почты можно цифры

  // Делаем данные уникальными, но валидными
  const initialFirstName = `Staff${uniqueStr}`; 
  const initialLastName = 'TestStaff';
  const staffLogin = `login${uniqueNum}`;
  const staffEmail = `test${uniqueNum}@mail.ru`;
  
  const editedLastName = 'Sobirov';
  const editedFirstName = `Samir${uniqueStr}`;

  before(() => {
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Полный цикл: Авторизация -> Добавление -> Изменение -> Удаление', () => {
    cy.viewport(1280, 800);

    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('GET', '**/staff*').as('getStaffList');

    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД
    // =========================================================
    cy.log('🟢 ШАГ 1: НАЧАЛО АВТОРИЗАЦИИ');

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });

    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 30000 });
    
    cy.url().should('include', '/sign-in');
    cy.get('body').should('be.visible');

    // Используем безопасный ввод
    cy.get('input[type="text"]', { timeout: 15000 })
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${Cypress.env('LOGIN_EMAIL')}`, { delay: 50, log: false }); 

    cy.get('input[type="password"]')
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${Cypress.env('LOGIN_PASSWORD')}`, { delay: 50, log: false });

    cy.wait(1000); 

    cy.get('button.sign-in-page__submit')
      .should('be.visible')
      .click({ force: true });

    cy.wait('@apiAuth', { timeout: 30000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      if (statusCode >= 400) {
        cy.writeFile('auth_api_status.txt', `ERROR_${statusCode}`); 
        throw new Error(`🆘 Ошибка авторизации: HTTP ${statusCode}`);
      }
    });

    cy.url({ timeout: 30000 }).should('not.include', '/sign-in');
    cy.writeFile('auth_api_status.txt', '1');

    cy.log('⚠️ Прямой переход в раздел Staff');
    cy.wait(4000); 

   cy.url({ timeout: 30000 }).should('not.include', '/sign-in');
    cy.writeFile('auth_api_status.txt', '1');

    cy.log('⚠️ Переход в раздел Staff через боковое меню');
    
    // Ждем появления сайдбара, чтобы убедиться, что дашборд прогрузился
    cy.get('.sidebar-link', { timeout: 20000 }).should('be.visible');

    // Кликаем по пункту "Сотрудники" (или Staff)
    // Используем селектор из твоего скриншота
    cy.contains('.sidebar-link', /Сотрудники|Staff/i)
      .scrollIntoView()
      .click();

    cy.url({ timeout: 20000 }).should('include', '/staff');
    
    cy.wait('@getStaffList', { timeout: 30000 }).then((interception) => {
      const statusCode = interception?.response?.statusCode || 200; 
      expect(statusCode).to.be.lessThan(400);
    });

    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    // Перехватываем POST запрос создания
    cy.intercept('POST', '**/api/staff*').as('apiCreateStaff');

    // 1. Ждем, пока исчезнет лоадер или появится заголовок "Список сотрудников"
    // Это гарантирует, что страница не пустая (белый экран)
    cy.contains('h3, h1, .page-header', /Список сотрудников|Staff List/i, { timeout: 30000 })
      .should('be.visible');

    // 2. Ищем кнопку более точечно. 
    // На твоем сайте это часто кнопка с классом .app-button или внутри хедера таблицы
    cy.get('button', { timeout: 20000 })
      .contains(/Добавить|Add/i)
      .should('be.visible')
      .click({ force: true });
      
    cy.wait(2500);

    // 1. Явно снимаем фокус через .blur() после каждого ввода
    cy.get('input[placeholder="Supplier A"]').first().scrollIntoView().should('be.visible').focus().type(`{selectall}{backspace}${initialLastName}`, { delay: 50 }).blur();
    cy.get('input[placeholder="Supplier A"]').last().scrollIntoView().should('be.visible').focus().type(`{selectall}{backspace}${initialFirstName}`, { delay: 50 }).blur();
    cy.get('input[placeholder="example@easybooking.com"]').scrollIntoView().should('be.visible').focus().type(`{selectall}{backspace}${staffEmail}`, { delay: 50 }).blur();

    cy.contains(/Логин|Login/i, { timeout: 30000 })
      .parent() 
      .find('input')
      .first()
      .scrollIntoView()         
      .should('be.visible')
      .focus()   
      .type(`{selectall}{backspace}${staffLogin}`, { delay: 50 })
      .blur();

    cy.contains('button', /Продолжить|Continue|Next/i, { timeout: 15000 })
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
      
    // 2. Убираем { force: true } при выборе роли
    cy.contains('.role-card', /Оператор|Operator/i, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .click(); 

    // 🔥 Жестко ждем 1 секунду для перерендера компонента React/Vue
    cy.wait(1000); 

    // 3. Кликаем создать СТРОГО БЕЗ force: true!
    cy.contains('button', /Создать|Create|Add/i, { timeout: 15000 })
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled') 
      .click(); // <--- УБРАЛИ { force: true }

    // 4. Ждем ответа от бэкенда
    cy.wait('@apiCreateStaff', { timeout: 20000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      expect(statusCode).to.be.oneOf([200, 201]); // Проверяем успешный статус
    });

    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.wait(2000); 

    cy.get('input[placeholder*="Поиск"], input[placeholder*="Search"]', { timeout: 10000 })
      .should('be.visible')
      .type(`{selectall}{backspace}${initialLastName}`, { delay: 50 });

    cy.wait(2000);

    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', initialLastName);
    cy.writeFile('auth_api_status.txt', '2');

    // =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr', { timeout: 20000 })
      .contains(initialLastName)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.contains('button', /Изменить|Edit|Update/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
    
    cy.contains('.p-tab', /Информация о пользователе|User Info/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.wait(1000);

    cy.get('.p-dialog input[type="text"]', { timeout: 10000 }).eq(0)
      .scrollIntoView()
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${editedLastName}`, { delay: 100 });

    cy.get('.p-dialog input[type="text"]').eq(1)
      .scrollIntoView()
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${editedFirstName}`, { delay: 100 });
    
    cy.contains('button', /Сохранить|Save/i)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
      
    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.wait(2000);
    
    cy.get('input[placeholder*="Поиск"], input[placeholder*="Search"]', { timeout: 10000 })
      .should('be.visible')
      .type(`{selectall}{backspace}${editedLastName}`, { delay: 50 });
      
    cy.wait(2000);
    
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', editedLastName);
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr')
      .contains(editedLastName)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
    
    cy.contains('button', /Удалить|Delete/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('.app-confirm-modal__button--accept', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true }); 

    cy.wait(2000);

    cy.get('.p-datatable').should('not.contain', editedFirstName);
    
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});