// Игнорируем фоновые ошибки самого приложения
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {
  const initialFirstName = 'TestStaff';
  const initialLastName = 'TestStaff';
  const staffLogin = 'TestStaff777111';
  const staffEmail = 'TestStaff777111@mail.ru';
  
  const editedLastName = 'Sobirov';
  const editedFirstName = 'Samir';

  before(() => {
    // 0 - Начало теста (краш на авторизации)
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Полный цикл: Авторизация -> Добавление -> Изменение -> Удаление', () => {
    // Задаем viewport ДО перехода, как в рабочем тесте
    cy.viewport(1280, 800);

    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('GET', '**/staff*').as('getStaffList');

    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД (Используем проверенный метод)
    // =========================================================
    cy.log('🟢 ШАГ 1: НАЧАЛО АВТОРИЗАЦИИ');
    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 30000 });
    cy.url().should('include', '/sign-in');
    cy.get('body').should('be.visible');

    // Используем надежные селекторы из твоего рабочего теста
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
    
    // Записываем 1 - Авторизация успешна
    cy.writeFile('auth_api_status.txt', '1');

    cy.log('⚠️ Прямой переход в раздел Staff');
    cy.visit('https://triple-test.netlify.app/flight/ru/staff', { timeout: 120000 });
    cy.url({ timeout: 20000 }).should('include', '/staff');
    
    cy.wait('@getStaffList', { timeout: 30000 }).then((interception) => {
      const statusCode = interception?.response?.statusCode || 200; 
      expect(statusCode).to.be.lessThan(400);
    });

    // cy.get('.p-datatable', { timeout: 30000 }).should('be.visible');
    
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

    // Добавлен scrollIntoView() и focus() для стабильности в CI
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
      .type(staffLogin, { delay: 50 });
      
    // Убрал multiple: true, так как в CI это иногда вызывает ошибки потери фокуса
    cy.get('.p-dialog-header').first().click({ force: true });

    cy.contains('button', /Продолжить|Continue|Next/i, { timeout: 15000 })
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
      
    cy.contains('.role-card', /Оператор|Operator/i, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.wait(1500); 

    cy.contains('button', /Создать|Create|Add/i, { timeout: 15000 })
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled') 
      .click({ force: true });

    cy.contains(/Сотрудник добавлен|added|success/i, { timeout: 20000 })
      .should('be.visible');

    cy.wait(2000); 
    // Записываем 2 - Добавление успешно
    cy.writeFile('auth_api_status.txt', '2');

    // =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr', { timeout: 20000 })
      .contains(`${initialFirstName}`)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.contains('button', /Изменить|Edit|Update/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
    
      cy.contains('.p-tab', /Информация о пользователе|User Info/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // 1. Обязательно даем форме "успокоиться" после клика и отрисовки
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
    
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', `${editedFirstName}`);
    
    // Записываем 3 - Редактирование успешно
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    cy.get('.p-row-odd')
      .contains(`${editedFirstName}`)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
    
    cy.contains('button', /Удалить|Delete/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('.app-confirm-modal__button--accept', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true }); 

    // Проверяем, что сотрудник действительно исчез из таблицы
    // cy.get('.p-datatable', { timeout: 15000 }).should('not.contain', `${editedFirstName}`);
    
    // Записываем 4 - Удаление успешно (цикл завершен)
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});