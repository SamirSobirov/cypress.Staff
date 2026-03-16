describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {

  const initialFirstName = 'TestStaff';
  const initialLastName = 'TestStaff';
  const staffLogin = 'TestStaff9005';
  const staffEmail = 'TestStaff9005@mail.ru';
  
  const editedLastName = 'Sobiros';
  const editedFirstName = 'Samir';

  before(() => {
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Полный цикл: Авторизация -> Добавление -> Изменение -> Удаление', () => {
    cy.viewport(1280, 800);

    // =========================================================
    // 🛡️ ЗАЩИТА ОТ ЗАВИСАНИЯ СТРАНИЦЫ
    // =========================================================
    cy.log('🛡️ Блокировка внешних скриптов для ускорения загрузки...');
    cy.intercept({ resourceType: 'image' }, { statusCode: 200, body: '' });
    cy.intercept({ resourceType: 'media' }, { statusCode: 200, body: '' });
    cy.intercept('GET', '**/google-analytics.com/**', { statusCode: 204 });
    cy.intercept('GET', '**/mc.yandex.ru/**', { statusCode: 204 });
    cy.intercept('GET', '**/fonts.googleapis.com/**', { statusCode: 204 });
    cy.intercept('GET', '**/fonts.gstatic.com/**', { statusCode: 204 });
    cy.intercept('GET', '**/sentry-cdn.com/**', { statusCode: 204 });

    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД
    // =========================================================
    cy.log('🟢 ШАГ 1: НАЧАЛО АВТОРИЗАЦИИ');
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/staff*').as('apiCreateStaff'); 
    
    // Перехватываем GET запрос загрузки списка сотрудников
    cy.intercept('GET', '**/staff*').as('getStaffList');

    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 120000 }); 
    cy.url().should('include', '/sign-in');

    // 🔥 ИСПРАВЛЕНИЕ: Ждем, пока прогрузится контейнер страницы авторизации
    cy.get('body').should('be.visible');
    cy.wait(2000); // Даем время фреймворку отрендерить инпуты

    // 🔥 ИСПРАВЛЕНИЕ: Универсальный селектор для поля логина
    cy.get('input[type="text"], input[type="email"], input[name="email"], input[name="login"]', { timeout: 30000 })
      .first()
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(Cypress.env('LOGIN_EMAIL'), { delay: 50, log: false })
      .trigger('change', { force: true }); 

    cy.get('input[type="password"]', { timeout: 30000 })
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(Cypress.env('LOGIN_PASSWORD'), { delay: 50, log: false })
      .trigger('change', { force: true });

    cy.get('button.sign-in-page__submit')
      .should('be.visible')
      .click({ force: true });

    cy.wait('@apiAuth', { timeout: 30000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      if (statusCode >= 400) {
        cy.writeFile('auth_api_status.txt', `ERROR_${statusCode}`); 
        throw new Error(`🆘 Ошибка: HTTP ${statusCode}`);
      }
      cy.writeFile('auth_api_status.txt', '1');
    });

    // Логика ожидания перехода:
    cy.url({ timeout: 20000 }).should('not.include', '/sign-in');
    
    // Ждем появления body на дэшборде, чтобы убедиться, что SPA приложение успело сохранить токен
    cy.get('body').should('be.visible'); 
    cy.wait(1000); // Небольшая пауза для страховки записи в localStorage

    cy.log('⚠️ Прямой переход в раздел Staff');
    cy.visit('https://triple-test.netlify.app/flight/ru/staff', { timeout: 120000 });
    
    cy.url({ timeout: 20000 }).should('include', '/staff');
    
    // Ждем, пока сервер вернет данные для таблицы, прежде чем искать ее в DOM
    cy.wait('@getStaffList', { timeout: 30000 }).then((interception) => {
      expect(interception.response.statusCode).to.be.lessThan(400);
    });

    cy.get('.p-datatable', { timeout: 30000 }).should('be.visible');
    
    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    cy.get('button', { timeout: 15000 })
      .filter(':contains("Добавить"), :contains("Add")')
      .first()
      .click({ force: true });
      
    cy.wait(2000); 

    cy.get('input[placeholder="Supplier A"]').first().should('be.visible').click({ force: true }).clear().type(initialLastName, { delay: 50 }).trigger('change', { force: true });
    cy.get('input[placeholder="Supplier A"]').last().should('be.visible').click({ force: true }).clear().type(initialFirstName, { delay: 50 }).trigger('change', { force: true });
    cy.get('input[placeholder="example@easybooking.com"]').should('be.visible').click({ force: true }).clear().type(staffEmail, { delay: 50 }).trigger('change', { force: true });

    cy.contains(/Логин|Login/i, { timeout: 30000 })
      .parent() 
      .find('input')
      .first()
      .scrollIntoView()         
      .should('be.visible')
      .click({ force: true })   
      .clear()
      .type(staffLogin, { delay: 50 })
      .trigger('change', { force: true });
      
    cy.get('.p-dialog-header').first().click({ force: true, multiple: true });

    cy.contains('button.app-button--primary.app-button--sm', /Продолжить|Continue|Next/i, { timeout: 15000 })
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
      
    cy.contains('.role-card', /Оператор|Operator/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.wait(1500);

    cy.contains('button.app-button--primary', /Создать|Create|Add/i, { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.wait('@apiCreateStaff', { timeout: 20000 });
    cy.writeFile('auth_api_status.txt', '2');

    // =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr', { timeout: 20000 })
      .contains(`${initialFirstName}`)
      .should('be.visible')
      .click({ force: true });

    cy.contains('button', /Изменить|Edit|Update/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
    
    cy.contains('.p-tab', /Информация о пользователе|User Info/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('input[type="text"]').eq(0)
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(editedLastName, { delay: 50 })
      .trigger('change', { force: true });

    cy.get('input[type="text"]').eq(1)
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(editedFirstName, { delay: 50 })
      .trigger('change', { force: true });
    
    cy.wait(1000);
    
    cy.contains('button.app-button--primary', /Сохранить|Save/i)
      .should('be.visible')
      .click({ force: true });
    
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', `${editedFirstName}`);
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    cy.get('.p-row-odd td ')
      .contains(`${editedFirstName}`)
      .should('be.visible')
      .click({ force: true });
    
    cy.contains('button', /Удалить|Delete/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('.app-confirm-modal__button--accept', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true }); 

    cy.get('.p-datatable-table-container', { timeout: 15000 }).should('not.contain', `${editedFirstName}`);
    
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});