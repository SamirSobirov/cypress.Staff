describe('Staff Management CRUD Flow', { pageLoadTimeout: 120000 }, () => {
  const staffData = {
    firstName: 'TestStaff',
    lastName: 'Monitoring',
    login: `staff_${Date.now()}`, // Уникальный логин для каждого запуска
    email: `test_${Date.now()}@example.com`,
    editedName: 'UpdatedStaff'
  };

  before(() => {
    // Изначально ставим 0 (начало работы)
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Execute Full Staff Lifecycle', () => {
    cy.viewport(1280, 800);

    // Оптимизация загрузки: блокируем лишнее
    cy.intercept({ resourceType: 'image' }, { statusCode: 200, body: '' });
    cy.intercept('GET', '**/google-analytics.com/**', { statusCode: 204 });

    // ПЕРЕХВАТЫ
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/staff*').as('apiCreate');
    cy.intercept('PATCH', '**/staff/*').as('apiEdit');
    cy.intercept('DELETE', '**/staff/*').as('apiDelete');

    // --- ШАГ 1: АВТОРИЗАЦИЯ ---
    cy.visit('https://triple-test.netlify.app/sign-in');
    
    cy.get('input[type="text"]', { timeout: 20000 }).type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.get('input[type="password"]').type(Cypress.env('LOGIN_PASSWORD'), { log: false });
    cy.get('button.sign-in-page__submit').click();

    cy.wait('@apiAuth').then((xhr) => {
      const code = xhr.response?.statusCode || 500;
      if (code >= 400) {
        cy.writeFile('auth_api_status.txt', `ERROR_${code}`);
        throw new Error(`Auth Failed: ${code}`);
      }
      cy.writeFile('auth_api_status.txt', '1'); // Успешно авторизовались
    });

    // Переход в раздел сотрудников
    cy.visit('https://triple-test.netlify.app/flight/ru/staff');
    cy.url().should('include', '/staff');

    // --- ШАГ 2: СОЗДАНИЕ ---
    cy.get('button').contains(/Добавить|Add/i).click({ force: true });
    
    cy.get('input[placeholder="Supplier A"]').first().type(staffData.lastName).trigger('change');
    cy.get('input[placeholder="Supplier A"]').last().type(staffData.firstName).trigger('change');
    cy.get('input[placeholder="example@easybooking.com"]').type(staffData.email).trigger('change');
    
    cy.contains(/Логин|Login/i).parent().find('input').first()
      .type(staffData.login).trigger('change');

    cy.get('.p-dialog-header').first().click(); // Снять фокус
    cy.contains('button', /Продолжить|Continue/i).click();
    cy.contains('.role-card', /Оператор|Operator/i).click();
    cy.contains('button', /Создать|Create/i).click();

    cy.wait('@apiCreate', { timeout: 20000 }).its('response.statusCode').should('be.lessThan', 400);
    cy.writeFile('auth_api_status.txt', '2'); // Успешно создали

    // --- ШАГ 3: РЕДАКТИРОВАНИЕ ---
    cy.get('.p-datatable-tbody').contains(staffData.firstName).click();
    cy.contains('button', /Изменить|Edit/i).click();
    cy.contains('.p-tab', /Информация/i).click();
    
    cy.get('input[type="text"]').eq(1).clear().type(staffData.editedName).trigger('change');
    cy.contains('button', /Сохранить|Save/i).click();

    cy.wait('@apiEdit').its('response.statusCode').should('be.lessThan', 400);
    cy.writeFile('auth_api_status.txt', '3'); // Успешно изменили

    // --- ШАГ 4: УДАЛЕНИЕ ---
    cy.get('.p-datatable-tbody').contains(staffData.editedName).click();
    cy.contains('button', /Удалить|Delete/i).click();
    cy.get('.app-confirm-modal__button--accept').click();

    cy.wait('@apiDelete').its('response.statusCode').should('be.lessThan', 400);
    cy.writeFile('auth_api_status.txt', '4'); // ПОЛНЫЙ УСПЕХ
  });
});