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
      .click()
      .clear()
      .type(Cypress.env('LOGIN_EMAIL'), { delay: 100, log: false }); 

    cy.get('input[type="password"]')
      .should('be.visible')
      .click()
      .clear()
      .type(Cypress.env('LOGIN_PASSWORD'), { delay: 100, log: false });

    cy.get('button.sign-in-page__submit')
      .should('be.visible')
      .should('not.be.disabled')
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
    
    cy.get('button.app-button--primary.app-button--xs', { timeout: 30000 })
      .should('be.visible');
    
    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    cy.get('button.app-button--primary.app-button--xs').click();
    cy.wait(2000); 

    // Вводим статичные Имя и Фамилию
    cy.get('input[placeholder="Supplier A"]').first().should('be.visible').click().clear().type(initialLastName, { delay: 100 });
    cy.get('input[placeholder="Supplier A"]').last().should('be.visible').click().clear().type(initialFirstName, { delay: 100 });
    
    // Вводим статичную почту
    cy.get('input[placeholder="example@easybooking.com"]').should('be.visible').click().clear().type(staffEmail, { delay: 100 });

    // Вводим статичный логин
    cy.get('input[placeholder*="логин"]', { timeout: 20000 })
      .scrollIntoView()         
      .should('be.visible')
      .click({ force: true })   
      .clear({ force: true })
      .type(staffLogin, { delay: 100 });

    cy.get('button.app-button--primary.app-button--sm')
      .contains('Продолжить')
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
      
    cy.get('.role-card', { timeout: 10000 }).contains('Оператор').should('be.visible').click();
    cy.get('button.app-button--primary').contains('Создать').should('be.visible').click();

    cy.wait('@apiCreateStaff', { timeout: 20000 });
    cy.writeFile('auth_api_status.txt', '2');

    // =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА');

    // Ищем строку "TestStaff TestStaff", которую только что создали
    cy.get('.p-datatable-tbody tr', { timeout: 20000 })
      .contains(`${initialLastName} ${initialFirstName}`)
      .should('be.visible')
      .click();

    cy.get('button.app-button--secondary', { timeout: 10000 }).contains('Изменить').should('be.visible').click();
    
    cy.get('.p-tab', { timeout: 10000 }).contains('Информация о пользователе').should('be.visible').click();

    // Заменяем на Sobiros Samir (в CI заменяем focus() на click() для надежности)
    cy.get('input[placeholder="Введите фамилию"]')
      .should('be.visible')
      .click()
      .clear()
      .type(editedLastName, { delay: 100 });

    cy.get('input[placeholder="Введите имя"]')
      .should('be.visible')
      .click()
      .clear()
      .type(editedFirstName, { delay: 100 });
    
    cy.get('button.app-button--primary').contains('Сохранить').should('be.visible').click();
    
    // Ждем, пока в таблице появится Sobiros Samir
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', `${editedLastName} ${editedFirstName}`);
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    // Кликаем по отредактированному Sobiros Samir
    cy.get('.p-datatable-tbody tr')
      .contains(`${editedLastName} ${editedFirstName}`)
      .should('be.visible')
      .click();
    
    cy.get('button.app-button--secondary', { timeout: 10000 }).contains('Удалить').should('be.visible').click();

    cy.get('.app-confirm-modal__button--accept', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true }); 

    // Проверяем, что Sobiros Samir исчез
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('not.contain', `${editedLastName} ${editedFirstName}`);
    
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});