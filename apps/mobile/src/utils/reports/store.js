import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const pad = (n) => String(n).padStart(2, "0");
function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DAY = 86400000;
const NOW = 1749980000000; // fixed so resume caching works

const INITIAL_REPORTS = [
  {
    id: "report-1",
    studentId: "1",
    studentName: "Айсель М.",
    subject: "IELTS",
    date: dateStr(-4),
    lessonId: null,
    topic: "Writing Task 2 — Academic Essay",
    description:
      "Разобрали структуру академического эссе: введение, тезис, аргументация и заключение. Особый акцент на связующие слова и академический стиль письма.",
    activityScore: 5,
    strengths:
      "Отличная структура параграфов. Богатый словарный запас. Уверенное использование академических фраз и linking words.",
    difficulties:
      "Управление временем — 40 минут на Task 2 всё ещё напряжённо. Переходы между параграфами требуют отработки.",
    homework:
      "Написать эссе на тему «Technology and Education» (250–280 слов) за 40 минут. Отправить мне до следующего урока.",
    nextLessonPlan:
      "Speaking Part 3 — дискуссионные вопросы. Разбор типичных ответов на Band 7–8. Работа над беглостью.",
    comment:
      "Айсель показывает отличный прогресс! Если продолжим в том же темпе, Band 7.5+ вполне реален к экзамену в августе.",
    createdAt: NOW - 4 * DAY,
    notificationSent: true,
    isRead: true,
  },
  {
    id: "report-2",
    studentId: "1",
    studentName: "Айсель М.",
    subject: "IELTS",
    date: dateStr(-6),
    lessonId: null,
    topic: "Speaking Part 3 — Discussion",
    description:
      "Практика Speaking Part 3. Работали над расширенными ответами и умением аргументировать позицию на сложные абстрактные темы. Темы: образование, технологии, окружающая среда.",
    activityScore: 4,
    strengths:
      "Хорошая беглость речи. Умение структурировать ответ (Point-Reason-Example). Хороший словарный запас по теме.",
    difficulties:
      "Паузы-заполнители «um», «uh» — нужно заменить на «Well,» и «That's a good question». Произношение некоторых академических слов.",
    homework:
      "Записать 5 ответов на Speaking Part 3 вопросы из Cambridge 18. Прослушать запись и выписать ошибки.",
    nextLessonPlan:
      "Writing Task 2 — аргументативное эссе. Структура: introduction + 2 body paragraphs + conclusion.",
    comment:
      "Хорошая работа! Небольшие паузы — это нормально на данном этапе. Главное — продолжать говорить и не замолкать.",
    createdAt: NOW - 6 * DAY,
    notificationSent: true,
    isRead: true,
  },
  {
    id: "report-3",
    studentId: "2",
    studentName: "Турал Н.",
    subject: "General",
    date: dateStr(-5),
    lessonId: null,
    topic: "Conditionals — 2nd & 3rd",
    description:
      "Изучили 2nd и 3rd Conditional. Практика через ролевые игры и реальные жизненные ситуации. Разбор типичных ошибок и случаев смешения форм.",
    activityScore: 3,
    strengths:
      "Хорошо понимает правило 3rd Conditional на теоретическом уровне. Активно участвует в упражнениях и задаёт вопросы.",
    difficulties:
      "Смешивает 2nd и 3rd Conditional в спонтанной речи. Нужно больше практики в естественном контексте, не только по упражнениям.",
    homework:
      "Упражнения 1–5 из Grammar in Use (стр. 114–115). Написать 5 реальных предложений о своей жизни с Conditionals.",
    nextLessonPlan:
      "Business Vocabulary — рабочие ситуации, деловые переговоры и электронная переписка.",
    comment:
      "Турал старается, но нужно больше практики между уроками. Рекомендую приложение Duolingo для ежедневного закрепления.",
    createdAt: NOW - 5 * DAY,
    notificationSent: true,
    isRead: false,
  },
  {
    id: "report-4",
    studentId: "3",
    studentName: "Лейла К.",
    subject: "SAT",
    date: dateStr(-4),
    lessonId: null,
    topic: "SAT Math — Algebra & Functions",
    description:
      "Разбор алгебраических уравнений и функций. Решение задач из официальных SAT тестов College Board. Анализ ошибок из пробного теста прошлой недели.",
    activityScore: 4,
    strengths:
      "100% посещаемость — Лейла не пропустила ни одного урока. Все домашние задания выполнены. Хорошее понимание линейных функций и систем уравнений.",
    difficulties:
      "Квадратные уравнения с дискриминантом — делает арифметические ошибки под давлением времени. Составные функции f(g(x)) требуют дополнительной практики.",
    homework:
      "Khan Academy: модуль Algebra 2, тема «Composite Functions». Решить SAT Math Practice Test 3 (секции 3 и 4) за 35 минут.",
    nextLessonPlan:
      "SAT Reading — Evidence-Based Reading. Стратегии работы с длинными академическими текстами. Technique: skim → questions → read.",
    comment:
      "Лейла очень старательная ученица! Нужно продолжать работу над Math, но прогресс очевиден. Цель SAT 1400+ реалистична.",
    createdAt: NOW - 4 * DAY,
    notificationSent: true,
    isRead: false,
  },
  {
    id: "report-5",
    studentId: "4",
    studentName: "Али Н.",
    subject: "IELTS",
    date: dateStr(-3),
    lessonId: null,
    topic: "Academic Writing — Task 1 Graphs",
    description:
      "Детальный разбор Writing Task 1: описание графиков, диаграмм и таблиц. Работали над структурой Overview и Body Paragraphs. Анализ и сравнение данных.",
    activityScore: 5,
    strengths:
      "Отличное описание тенденций. Правильное использование языка сравнения (whereas, while, in contrast). Хороший контроль времени — укладывается в 20 минут.",
    difficulties:
      "Academic Vocabulary в Writing Task 2 — нужно расширить словарный запас по темам Education, Technology, Environment.",
    homework:
      "Writing Task 1 из Cambridge IELTS 17, Test 2. Написать за 20 минут, отправить для проверки.",
    nextLessonPlan:
      "Vocabulary для Writing Task 2: тематические списки слов, идиомы академического письма.",
    comment:
      "Стабильный прогресс! Цель Band 8.0 к августу выглядит реально. Нужно поддерживать текущий темп работы.",
    createdAt: NOW - 3 * DAY,
    notificationSent: true,
    isRead: false,
  },
];

function sortByDate(a, b) {
  return b.createdAt - a.createdAt;
}

export const useReportsStore = create(
  persist(
    (set) => ({
      reports: [],

      addReport: (report) =>
        set((state) => ({
          reports: [report, ...state.reports],
        })),

      updateReport: (id, updates) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deleteReport: (id) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        })),

      markAsRead: (id) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, isRead: true } : r
          ),
        })),

      // Get all reports for a specific student
      getReportsByStudent: (studentId) =>
        useReportsStore.getState().reports.filter((r) => r.studentId === studentId),
    }),
    {
      name: "reports-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
