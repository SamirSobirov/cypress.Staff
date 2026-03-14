describe('Staff Management Flow', () => {

  before(() => {
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Полный цикл: Авторизация -> Добавление -> Изменение -> Удаление', () => {
    cy.viewport(1280, 800);

    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД
    // =========================================================
    cy.log('🟢 ШАГ 1: НАЧАЛО АВТОРИЗАЦИИ');
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/staff**').as('apiCreateStaff'); 

    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 60000 }); // Увеличен таймаут для CI
    cy.url().should('include', '/sign-in');

    // Ждем именно видимости инпута, кликаем, затем вводим с бОльшим delay
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
    cy.visit('https://triple-test.netlify.app/flight/ru/staff', { timeout: 60000 });
    
    cy.url({ timeout: 20000 }).should('include', '/staff');
    
    // Ждем, пока кнопка добавления точно появится на экране
    cy.get('button.app-button--primary.app-button--xs', { timeout: 30000 })
      .should('be.visible');
    
    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
  cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');

    cy.get('button.app-button--primary.app-button--xs').click();

    // Небольшая хардкод-пауза, чтобы анимация модалки в CI точно завершилась
    cy.wait(2000); 

    cy.get('input[placeholder="Supplier A"]').first().should('be.visible').click().type('TestStaff1', { delay: 100 });
    cy.get('input[placeholder="Supplier A"]').last().should('be.visible').click().type('TestStaff1', { delay: 100 });
    cy.get('input[placeholder="example@easybooking.com"]').should('be.visible').click().type('TestStaff9005@mail.com', { delay: 100 });

    // 🔥 ЖЕЛЕЗОБЕТОННЫЙ ВВОД ЛОГИНА
    // Используем *= (содержит слово "логин"), скроллим к нему и кликаем с force: true
    cy.get('input[placeholder*="логин"]', { timeout: 20000 })
      .scrollIntoView()         // Принудительно прокручиваем модалку до этого поля
      .should('be.visible')
      .click({ force: true })   // Пробиваем любые перекрытия
      .clear({ force: true })
      .type('TestStaff9005', { delay: 100 });

    // Кликаем "Продолжить"
    cy.get('button.app-button--primary.app-button--sm')
      .contains('Продолжить')
      .scrollIntoView() 
      .should('be.visible')
      .click({ force: true });
    // Ожидание отрисовки следующего шага
    cy.get('.role-card', { timeout: 10000 }).contains('Оператор').should('be.visible').click();
    cy.get('button.app-button--primary').contains('Создать').should('be.visible').click();

    cy.wait('@apiCreateStaff', { timeout: 20000 });
    cy.writeFile('auth_api_status.txt', '2');

    // =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ СОТРУДНИКА');

    // Ищем нужную строку и убеждаемся, что она загрузилась
    cy.get('.p-datatable-tbody tr', { timeout: 20000 })
      .contains('TestStaff')
      .should('be.visible')
      .click();
    
    cy.get('button.app-button--secondary', { timeout: 10000 }).contains('Изменить').should('be.visible').click();
    
    cy.get('.p-tab', { timeout: 10000 }).contains('Информация о пользователе').should('be.visible').click();

    cy.get('input[placeholder="Введите фамилию"]')
      .should('be.visible')
      .click()
      .clear()
      .type('S', { delay: 100 });

    cy.get('input[placeholder="Введите имя"]')
      .should('be.visible')
      .click()
      .clear()
      .type('Samir', { delay: 100 });
    
    cy.get('button.app-button--primary').contains('Сохранить').should('be.visible').click();
    
    // Ждем обновления таблицы, чтобы убедиться, что сохранение прошло
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', 'S Samir');
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ СОТРУДНИКА');

    cy.get('.p-datatable-tbody tr').contains('S Samir').should('be.visible').click();
    
    cy.get('button.app-button--secondary', { timeout: 10000 }).contains('Удалить').should('be.visible').click();

    // Подтверждение в модальном окне
    cy.get('.app-confirm-modal__button--accept', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true }); 

    // Убеждаемся, что строка исчезла
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('not.contain', 'S Samir');
    
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});