// Игнорируем фоновые ошибки самого приложения
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {
  // Только цифры, никаких спецсимволов и букв, чтобы точно пройти любую строгую валидацию
  const uniqueId = Math.floor(Math.random() * 10000000); 

  // УБРАЛИ ВСЕ ПОДЧЕРКИВАНИЯ из логина и email, чтобы фронтенд их не блокировал!
  const initialFirstName = `Staff${uniqueId}`; 
  const initialLastName = 'TestStaff';
  const staffLogin = `login${uniqueId}`;
  const staffEmail = `test${uniqueId}@mail.ru`;
  
  const editedLastName = 'Sobirov';
  const editedFirstName = `Samir${uniqueId}`;

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

    // 🔥 ДОБАВЛЯЕМ .blur() НА КАЖДОЕ ПОЛЕ, чтобы форма принудительно проверила данные
    cy.get('input[placeholder="Supplier A"]').first().scrollIntoView().should('be.visible').focus().clear().type(initialLastName, { delay: 50 }).blur();
    cy.get('input[placeholder="Supplier A"]').last().scrollIntoView().should('be.visible').focus().clear().type(initialFirstName, { delay: 50 }).blur();
    cy.get('input[placeholder="example@easybooking.com"]').scrollIntoView().should('be.visible').focus().clear().type(staffEmail, { delay: 50 }).blur();

    cy.contains(/Логин|Login/i, { timeout: 30000 })
      .parent() 
      .find('input')
      .first()
      .scrollIntoView()         
      .should('be.visible')
      .focus()   
      .clear()
      .type(staffLogin, { delay: 50 })
      .blur(); 
      
    cy.wait(1000);

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

    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.wait(2000); 

    cy.get('input[placeholder*="Поиск"], input[placeholder*="Search"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(initialLastName, { delay: 50 });

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
      .type(`{selectall}{backspace}${editedLastName}`, { delay: 100 }).blur();

    cy.get('.p-dialog input[type="text"]').eq(1)
      .scrollIntoView()
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${editedFirstName}`, { delay: 100 }).blur();
    
    cy.contains('button', /Сохранить|Save/i)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
      
    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.wait(2000);
    
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