// Игнорируем фоновые ошибки самого приложения
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

const generateLetters = (len) => {
  let res = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

describe('Staff Management Flow', { pageLoadTimeout: 120000 }, () => {
  const uniqueStr = generateLetters(6);
  const uniqueNum = Math.floor(Math.random() * 1000000);

  const initialFirstName = `Staff${uniqueStr}`; 
  const initialLastName = 'TestStaff'; // Фамилия для поиска при создании
  const staffLogin = `login${uniqueNum}`;
  const staffEmail = `test${uniqueNum}@mail.ru`;
  
  const editedLastName = 'Sobirov'; // Фамилия, которая остается после редактирования
  const editedFirstName = `Samir${uniqueStr}`;

  before(() => {
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Полный цикл: Очистка -> Авторизация -> Добавление -> Изменение -> Удаление', () => {
    cy.viewport(1280, 800);

    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('GET', '**/staff*').as('getStaffList');
    cy.intercept('POST', '**/api/staff*').as('apiCreateStaff');
    cy.intercept('DELETE', '**/api/staff/*').as('apiDeleteStaff');

    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ
    // =========================================================
    cy.log('🟢 ШАГ 1: АВТОРИЗАЦИЯ');
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('https://triple-test.netlify.app/sign-in', { timeout: 30000 });
    
    cy.get('input[type="text"]').first().type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.get('input[type="password"]').type(Cypress.env('LOGIN_PASSWORD'), { log: false });
    cy.get('button.sign-in-page__submit').click();

    cy.wait('@apiAuth', { timeout: 30000 });
    cy.writeFile('auth_api_status.txt', '1');

    // Переход в Staff через боковое меню
    cy.get('.sidebar-link', { timeout: 25000 }).should('be.visible');
    cy.contains('.sidebar-link', /Сотрудники|Staff/i).click();
    cy.url().should('include', '/staff');
    cy.wait('@getStaffList', { timeout: 30000 });

    // =========================================================
    // ПРЕДВАРИТЕЛЬНАЯ ОЧИСТКА (CLEANUP)
    // =========================================================
    cy.log('🧹 ШАГ: ОЧИСТКА СТАРЫХ ДАННЫХ');
    cy.get('body').then(($body) => {
      // Ищем, нет ли в таблице Sobirov (от прошлых падений)
      cy.get('input[placeholder*="Поиск"], input[placeholder*="Search"]').type(`{selectall}{backspace}${editedLastName}`);
      cy.wait(2000); // Даем таблице отфильтровать

      if ($body.find(`.p-datatable-tbody:contains("${editedLastName}")`).length > 0) {
        cy.log('🗑️ Найден старый сотрудник, удаляем...');
        cy.contains('.p-datatable-tbody tr', editedLastName).click({ force: true });
        cy.contains('button', /Удалить|Delete/i).click({ force: true });
        cy.get('.app-confirm-modal__button--accept').click({ force: true });
        cy.wait('@apiDeleteStaff');
        cy.wait(2000);
      } else {
        cy.log('✨ Старых данных не найдено, продолжаем');
      }
    });

    // =========================================================
    // ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА
    // =========================================================
    cy.log('🟢 ШАГ 2: ДОБАВЛЕНИЕ СОТРУДНИКА');
    
    cy.get('button').contains(/Добавить|Add/i).should('be.visible').click({ force: true });
    cy.wait(2000);

    // Заполнение формы
    cy.get('input[placeholder="Supplier A"]').first().type(initialLastName).blur();
    cy.get('input[placeholder="Supplier A"]').last().type(initialFirstName).blur();
    cy.get('input[placeholder="example@easybooking.com"]').type(staffEmail).blur();

    cy.contains(/Логин|Login/i).parent().find('input').first()
      .type(staffLogin).blur();

    cy.contains('button', /Продолжить|Continue|Next/i).click({ force: true });
    
    cy.contains('.role-card', /Оператор|Operator/i).click(); 
    cy.wait(1500); // Твой лаг: ждем пересчета валидации

    cy.contains('button', /Создать|Create|Add/i).should('not.be.disabled').click(); 

    // Ждем ответа сервера (даже если он тупит 5 секунд)
    cy.wait('@apiCreateStaff', { timeout: 25000 });
    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');

    // Поиск созданного (с большим таймаутом на "прогрузку" в таблице)
    cy.get('input[placeholder*="Поиск"]').type(`{selectall}{backspace}${initialLastName}`);
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', initialLastName);
    cy.writeFile('auth_api_status.txt', '2');

    // =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ');
    cy.contains('.p-datatable-tbody tr', initialLastName).click({ force: true });
    cy.contains('button', /Изменить|Edit|Update/i).click({ force: true });
    cy.contains('.p-tab', /Информация о пользователе|User Info/i).click({ force: true });
    cy.wait(1000);

    cy.get('.p-dialog input[type="text"]').eq(0).type(`{selectall}{backspace}${editedLastName}`);
    cy.get('.p-dialog input[type="text"]').eq(1).type(`{selectall}{backspace}${editedFirstName}`);
    cy.contains('button', /Сохранить|Save/i).click({ force: true });
      
    cy.get('.p-dialog', { timeout: 15000 }).should('not.exist');
    cy.get('input[placeholder*="Поиск"]').type(`{selectall}{backspace}${editedLastName}`);
    cy.get('.p-datatable-tbody', { timeout: 15000 }).should('contain', editedLastName);
    cy.writeFile('auth_api_status.txt', '3');

    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ');
    cy.contains('.p-datatable-tbody tr', editedLastName).click({ force: true });
    cy.contains('button', /Удалить|Delete/i).click({ force: true });
    cy.get('.app-confirm-modal__button--accept').click({ force: true }); 

    cy.wait('@apiDeleteStaff', { timeout: 20000 });
    cy.get('.p-datatable-tbody', { timeout: 10000 }).should('not.contain', editedFirstName);
    
    cy.writeFile('auth_api_status.txt', '4');
    cy.log('🎉 ЦИКЛ ПОЛНОСТЬЮ ЗАВЕРШЕН!');
  });
});