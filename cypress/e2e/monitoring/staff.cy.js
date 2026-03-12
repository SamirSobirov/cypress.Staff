describe('Staff Management Flow', () => {

  before(() => {
    cy.writeFile('auth_api_status.txt', 'UNKNOWN');
  });

  it('Login Flow and Navigate to Add Staff', () => {
    cy.viewport(1280, 800);

    // --- 1. ПЕРЕХВАТ API ---
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/staff**').as('apiCreateStaff'); 

    // --- 2. ПЕРЕХОД НА СТРАНИЦУ ---
    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 30000 });
    
    cy.url().should('include', '/sign-in');
    cy.get('body').should('be.visible');

    // --- 3. ВВОД ЛОГИНА ---
    cy.get('input[type="text"]', { timeout: 15000 })
      .should('be.visible')
      .focus()
      .clear()
      .type(Cypress.env('LOGIN_EMAIL'), { delay: 50, log: false }); 

    // --- 4. ВВОД ПАРОЛЯ ---
    cy.get('input[type="password"]')
      .should('be.visible')
      .focus()
      .clear()
      .type(Cypress.env('LOGIN_PASSWORD'), { delay: 50, log: false });

    cy.wait(1000); 

    // --- 5. КЛИК "ВОЙТИ" ---
    cy.get('button.sign-in-page__submit')
      .should('be.visible')
      .click({ force: true });

    // --- 6. УМНАЯ ПРОВЕРКА ОТВЕТА СЕРВЕРА ---
    cy.wait('@apiAuth', { timeout: 20000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('auth_api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        throw new Error(`🆘 Ошибка сервера при авторизации: HTTP ${statusCode}`);
      }
    });

    // --- 7. ПРОВЕРКА УСПЕШНОГО ВХОДА ---
    cy.url({ timeout: 20000 }).should('not.include', '/sign-in');
    cy.log('✅ Авторизация прошла успешно');

    cy.wait(2000);

    // --- 8. ПЕРЕХОД В РАЗДЕЛ "СОТРУДНИКИ" ---
    cy.get('a[href="/flight/ru/staff"]', { timeout: 15000 })
      .should('be.visible')
      .click();

    cy.url({ timeout: 15000 }).should('include', '/staff');
    
    cy.wait(1500);

   // --- 9. КЛИК "ДОБАВИТЬ СОТРУДНИКА" ---
    cy.get('button.app-button--primary.app-button--xs', { timeout: 15000 })
      .should('be.visible')
      .click();

    cy.log('✅ Форма добавления открыта');
    cy.wait(1500); // Даем форме время на анимацию появления

    // --- 10. ЗАПОЛНЕНИЕ ПОЛЕЙ (ПО ТВОИМ СКРИНШОТАМ) ---

    // Поле "Логин" (скрин 1: id="v-181", placeholder="Введите логин")
    cy.get('#v-54')
      .should('be.visible')
      .focus()
      .clear()
      .type('TestStaff1', { delay: 50 });

    // Поле "Фамилия" (скрин 2: id="v-183", placeholder="Supplier A")
    // Используем ID, так как это самый надежный способ
    cy.get('#v-56')
      .should('be.visible')
      .focus()
      .clear()
      .type('TestStaff1', { delay: 50 });

    // Поле "Имя" (скрин 3: id="v-185", placeholder="Supplier A")
    cy.get('#v-58')
      .should('be.visible')
      .focus()
      .clear()
      .type('TestStaff1', { delay: 50 });

    cy.log('✅ Первые три поля заполнены: TestStaff1');
    
    // Жду следующие скриншоты (пароль, роль, выбор компании или кнопка Сохранить)
  });
});