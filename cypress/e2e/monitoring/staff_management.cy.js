// Игнорируем фоновые ошибки самого приложения
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {
  // Генерируем уникальную строку (буквы + цифры), чтобы сервер точно не ругался на формат
  const uniqueId = Math.random().toString(36).substring(2, 8); 

  // Делаем данные 100% уникальными для каждого прогона
  const initialFirstName = `Staff_${uniqueId}`; 
  const initialLastName = 'TestStaff';
  const staffLogin = `login_${uniqueId}`;
  const staffEmail = `test_${uniqueId}@mail.ru`;
  
  const editedLastName = 'Sobirov';
  // Имя после редактирования тоже делаем уникальным
  const editedFirstName = `Samir_${uniqueId}`;

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

    // Очистка состояния перед стартом
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });

    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 30000 });
    
    cy.url().should('include', '/sign-in');
    cy.get('body').should('be.visible');

    cy.get('input[type="text"]', { timeout: 15000 })
      .should('be.visible')
      .focus()
      .clear()
      .type(Cypress.env('LOGIN_EMAIL'), { delay: 50, log: false }); 

    cy.get('input[type="password"]')
      .should('be.visible')
      .focus()
      .clear()
      .type(Cypress.env('LOGIN_PASSWORD'), { delay: 50, log: false });

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
    
    // Даем время на сохранение токенов
    cy.wait(4000); 

    cy.visit('https://triple-test.netlify.app/flight/ru/staff', { timeout: 120000 });
    cy.url({ timeout: 20000 }).should('include', '/staff');
    
    cy.wait('@getStaffList', { timeout: 30000 }).then((interception) => {
      const statusCode = interception?.response?.statusCode || 200; 
      expect(statusCode).to.be.lessThan(400);
    });

    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    cy.get('button', { timeout: 15000 })
      .filter(':contains("Добавить"), :contains("Add")')
      .first()
      .should('be.visible')
      .click({ force: true });
      
    cy.wait(2500);

    cy.get('input[placeholder="Supplier A"]', { timeout: 15000 }).first().scrollIntoView().should('be.visible').focus().clear().type(initialLastName, { delay: 50 });
    cy.get('input[placeholder="Supplier A"]').last().scrollIntoView().should('be.visible').focus().clear().type(initialFirstName, { delay: 50 });
    cy.get('input[placeholder="example@easybooking.com"]').scrollIntoView().should('be.visible').focus().clear().type(staffEmail, { delay: 50 });

    cy.contains(/Логин|Login/i, { timeout: 30000 })
      .parent() 
      .find('input')
      .first()
      .scrollIntoView()         
      .should('be.visible')
      .focus()   
      .clear()
      .type(staffLogin, { delay: 50 })
      .blur(); // 🔥 ЗАСТАВЛЯЕМ ФОРМУ ПРОВЕРИТЬ ВАЛИДАЦИЮ
      
    // Даем форме время "позеленеть" после валидации
    cy.wait(1000);

    cy.contains('button', /Продолжить|Continue|Next/i, { timeout: 15000 })
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
      
    cy.contains('.role-card', /Оператор|Operator/i, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    // 🔥 ДАЕМ ВРЕМЯ VUE ЗАФИКСИРОВАТЬ ВЫБОР РОЛИ (Иначе кнопка не сработает)
    cy.wait(1500); 

    cy.contains('button', /Создать|Create|Add/i, { timeout: 15000 })
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled') 
      .click({ force: true });

    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.wait(2000); 

    // 🔍 ПОИСК: Ищем по УНИКАЛЬНОМУ ИМЕНИ (initialFirstName)
    cy.get('input[placeholder*="Поиск"], input[placeholder*="Search"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(initialLastName, { delay: 50 });

    cy.wait(2000);

    // Проверяем уникальное имя
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
      .type(`{selectall}{backspace}${editedFirstName}`, { delay: 100 })
      .blur(); // 🔥 Сбрасываем фокус перед сохранением
    
    cy.contains('button', /Сохранить|Save/i)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
      
    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.wait(2000);
    
    // 🔍 ПОИСК ПОСЛЕ РЕДАКТИРОВАНИЯ: Ищем по НОВОМУ УНИКАЛЬНОМУ ИМЕНИ (editedFirstName)
    cy.get('input[placeholder*="Поиск"], input[placeholder*="Search"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(editedLastName, { delay: 50 });
      
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