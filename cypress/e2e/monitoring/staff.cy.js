describe('Staff Management Flow', () => {

  before(() => {
    cy.writeFile('auth_api_status.txt', 'UNKNOWN');
  });

  it('Полный цикл: Авторизация -> Добавление -> Изменение -> Удаление', () => {
    cy.viewport(1280, 800);

    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД В РАЗДЕЛ
    cy.log('🟢 ШАГ 1: НАЧАЛО АВТОРИЗАЦИИ');
    
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/staff**').as('apiCreateStaff'); 

    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 30000 });
    cy.url().should('include', '/sign-in');

    cy.get('input[type="text"]').focus().clear().type(Cypress.env('LOGIN_EMAIL'), { delay: 50, log: false }); 
    cy.get('input[type="password"]').focus().clear().type(Cypress.env('LOGIN_PASSWORD'), { delay: 50, log: false });
    cy.get('button.sign-in-page__submit').click({ force: true });

    cy.wait('@apiAuth', { timeout: 20000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      if (statusCode >= 400) throw new Error(`🆘 Ошибка: HTTP ${statusCode}`);
    });

    cy.get('a[href="/flight/ru/staff"]', { timeout: 15000 }).should('be.visible').click();
    cy.url({ timeout: 15000 }).should('include', '/staff');
    cy.wait(1500);

    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    cy.get('button.app-button--primary.app-button--xs').click();
    cy.wait(1500);

    cy.get('input[placeholder="Введите логин"]').type('TestStaff9005', { delay: 50 });
    cy.get('input[placeholder="Supplier A"]').first().type('TestStaff1', { delay: 50 });
    cy.get('input[placeholder="Supplier A"]').last().type('TestStaff1', { delay: 50 });
    cy.get('input[placeholder="example@easybooking.com"]').type('TestStaff9005@mail.com', { delay: 50 });
    
    cy.get('button.app-button--primary.app-button--sm').contains('Продолжить').click();
    cy.wait(1000);
    
    cy.get('.role-card').contains('Оператор').click();
    cy.get('button.app-button--primary').contains('Создать').click();

    cy.wait('@apiCreateStaff', { timeout: 15000 });
    cy.wait(2000);

    // ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr').contains('TestStaff').should('be.visible').click();
    cy.wait(1000);
    
    cy.get('button.app-button--secondary').contains('Изменить').click();
    cy.wait(1000);
    
    cy.get('.p-tab').contains('Информация о пользователе').click();
    cy.wait(500);

    cy.get('input[placeholder="Введите фамилию"]').focus().clear().type('Sobiros', { delay: 50 });
    cy.get('input[placeholder="Введите имя"]').focus().clear().type('Samir', { delay: 50 });
    
    cy.get('button.app-button--primary').contains('Сохранить').click();
    cy.wait(2000);

    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    // Кликаем на сотрудника в таблице
    cy.get('.p-datatable-tbody tr').contains('Sobiros Samir').should('be.visible').click();
    cy.wait(1000);
    
    // 1. Нажимаем кнопку "Удалить" в боковой карточке
    cy.get('button.app-button--secondary').contains('Удалить').should('be.visible').click();
    
    cy.log('⚠️ Ожидаю модальное окно удаления');
    cy.wait(1000);

    // 2. ИСПРАВЛЕНИЕ: Клик по кнопке в модальном окне
    cy.get('.app-confirm-modal__button--accept', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true }); 

    cy.log('✅ Удаление подтверждено');

    // 3. Проверка исчезновения сотрудника из таблицы
    cy.get('.p-datatable-tbody', { timeout: 10000 }).should('not.contain', 'Sobiros Samir');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});