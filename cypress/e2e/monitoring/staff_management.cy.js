describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {

  // Жестко заданные статические данные по вашему требованию
  const initialFirstName = 'TestStaff';
  const initialLastName = 'TestStaff';
  const staffLogin = 'TestStaff9005';
  const staffEmail = 'TestStaff9005@mail.ru';
  
  // Данные после редактирования
  const editedLastName = 'Sobiros';
  const editedFirstName = 'Samir';

  before(() => {
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Полный цикл: Авторизация -> Добавление -> Изменение -> Удаление', () => {
    cy.viewport(1280, 800);

    // =========================================================
    // 🛡️ ЗАЩИТА ОТ ЗАВИСАНИЯ СТРАНИЦЫ В CI
    // =========================================================
    cy.log('🛡️ Блокировка внешних скриптов для ускорения загрузки...');
    cy.intercept('GET', '**/google-analytics.com/**', { statusCode: 204 });
    cy.intercept('GET', '**/mc.yandex.ru/**', { statusCode: 204 });
    cy.intercept('GET', '**/fonts.googleapis.com/**', { statusCode: 204 });
    cy.intercept('GET', '**/fonts.gstatic.com/**', { statusCode: 204 });

    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД
    // =========================================================
    cy.log('🟢 ШАГ 1: НАЧАЛО АВТОРИЗАЦИИ');
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/staff**').as('apiCreateStaff'); 

    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 120000 }); 
    cy.url().should('include', '/sign-in');

    cy.get('input[type="text"]', { timeout: 30000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true })
      .clear()
      .type(Cypress.env('LOGIN_EMAIL'), { delay: 100, log: false }); 

    cy.get('input[type="password"]')
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(Cypress.env('LOGIN_PASSWORD'), { delay: 100, log: false });

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

    cy.log('⚠️ Прямой переход в раздел Staff');
    cy.visit('https://triple-test.netlify.app/flight/ru/staff', { timeout: 120000 });
    
    cy.url({ timeout: 20000 }).should('include', '/staff');
    
    // 🔥 Исправлено: Ждем кнопку по тексту "Добавить" (или Add), а не по классу
    cy.contains('button', /Добавить|Add/i, { timeout: 30000 })
      .should('be.visible');
    
    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    // 🔥 Исправлено: Кликаем по кнопке по тексту
    cy.contains('button', /Добавить|Add/i).click({ force: true });
    cy.wait(2000); 

    cy.get('input[placeholder="Supplier A"]').first().should('be.visible').click({ force: true }).clear().type(initialLastName, { delay: 100 });
    cy.get('input[placeholder="Supplier A"]').last().should('be.visible').click({ force: true }).clear().type(initialFirstName, { delay: 100 });
    cy.get('input[placeholder="example@easybooking.com"]').should('be.visible').click({ force: true }).clear().type(staffEmail, { delay: 100 });

    cy.contains(/Логин|Login/i, { timeout: 30000 })
      .parent() 
      .find('input')
      .first()
      .scrollIntoView()         
      .should('be.visible')
      .click({ force: true })   
      .clear({ force: true })
      .type(staffLogin, { delay: 100 });
      
    cy.contains('button.app-button--primary.app-button--sm', /Продолжить|Continue|Next/i, { timeout: 15000 })
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
      
    cy.contains('.role-card', /Оператор|Operator/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // 🔥 Ждем валидации формы
    cy.wait(1500);

    // 🔥 Кликаем "Создать" БЕЗ force, ожидая, пока кнопка станет активной
    cy.contains('button.app-button--primary', /Создать|Create|Add/i, { timeout: 15000 })
      .should('be.visible')
      .should('not.be.disabled') 
      .click();

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
      .clear({ force: true })
      .type(editedLastName, { delay: 100 });

    cy.get('input[type="text"]').eq(1)
      .should('be.visible')
      .click({ force: true })
      .clear({ force: true })
      .type(editedFirstName, { delay: 100 });
    
    // Ждем валидации перед сохранением
    cy.wait(1000);
    
    // 🔥 Сохраняем тоже без force, чтобы убедиться, что данные прошли валидацию
    cy.contains('button.app-button--primary', /Сохранить|Save/i)
      .should('be.visible')
      .should('not.be.disabled')
      .click();
    
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', `${editedFirstName}`);
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr')
      .contains(`${editedFirstName}`)
      .should('be.visible')
      .click({ force: true });
    
    cy.contains('button', /Удалить|Delete/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // Модалка удаления обычно не требует валидации, тут force безопасен
    cy.get('.app-confirm-modal__button--accept', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true }); 

    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('not.contain', `${editedFirstName}`);
    
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});