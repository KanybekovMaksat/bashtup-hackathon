import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Chip } from '@heroui/react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import './App.css';
import { getSupabaseClient } from './lib/supabase';

type Participant = {
  id: number;
  fullName: string;
};

const heroImage = '/hero.png';
const EXTERNAL_GROUP = 'Не из Comtehno';

const navItems = [
  { label: 'О хакатоне', href: '#about' },
  { label: 'Программа', href: '#program' },
  { label: 'Регистрация', href: '#register' },
];

const tracks = [
  {
    title: 'Технологии и разработка',
    text: 'SaaS, робототехника, FinTech - создание цифровых продуктов, автоматизация, системы и MVP-решения.',
  },
  {
    title: 'Образование и общество',
    text: 'EdTech, Social Impact - обучение, развитие навыков, доступность и проекты с социальной пользой.',
  },
  {
    title: 'Среда и сервисы',
    text: 'Eco, Tourism - экология, городская среда, путешествия и полезные сервисы для жизни.',
  },
];

const programDays = [
  {
    day: 'День 1',
    date: '12 мая',
    theme: 'Старт и команды',
    items: [
      'Открытие хакатона',
      'Объявление правил и критериев оценки',
      'Тимбилдинг, 2 часа',
      'Формирование команд',
      'Начало работы над проектами',
      'Выступления приглашённых спикеров',
    ],
  },
  {
    day: 'День 2',
    date: '13 мая',
    theme: 'Разработка и менторы',
    items: [
      'Активная разработка проектов',
      'Работа с менторами',
      'Выступление спикера',
      'Чекпоинт: предварительная проверка проектов',
      'Продолжение разработки',
    ],
  },
  {
    day: 'День 3',
    date: '14 мая',
    theme: 'Питчи и финал',
    items: [
      'Финальная подготовка проектов',
      'Презентации команд: 3 минуты питч + 2 минуты вопросы',
      'Оценка жюри',
      'Награждение победителей',
      'Закрытие хакатона',
    ],
  },
];

const awards = [
  { img: '/rocket.png', label: 'Лучшая идея' },
  { img: '/design.png', label: 'Лучший дизайн' },
  { img: '/code.svg', label: 'Лучшая техническая реализация' },
  { img: '/discovery.png', label: 'Лучшая презентация' },
  { img: '/idea.png', label: 'Самый полезный проект для общества' },
];

const pastEvents = [
  {
    year: '2023',
    title: 'BashtUp 1',
    image:
      '/photo1.jpg',
  },
  {
    year: '2024',
    title: 'Город Будущего',
    image:
      '/photo2.jpg',
  },
  {
    year: '2025',
    title: 'BashtUp 2',
    image:
      '/photo3.jpg',
  },
  {
    year: '2024',
    title: 'Город Будущего',
    image:
      '/photo4.jpg',
  },
  {
    year: '2025',
    title: 'BashtUp 2',
    image:
      '/photo5.jpg',
  },
  {
    year: '2025',
    title: 'BashtUp 2',
    image:
      '/photo6.jpg',
  },
];

const partnerLogos = [
  {
    img: '/intuit.png',
    mark: 'МУИТ',
    label: 'Международный университет инновационных технологий',
  },
  {
    img: '/comtehno.png',
    mark: 'Comtehno',
    label: 'Колледж компьютерных систем и технологий',
  },
  {
    img: '/bashtup.svg',
    mark: 'Bashtup',
    label: 'Студенческий хакатон',
  },
];

const groups = [
  'ПОВТ-1-25',
  'ПОВТ-2-25',
  'ПОВТ-3-25',
  'ПОВТ-4-25',
  'ДПО-1-25',
  'ДПО-2-25',
  'ДПО-3',
  'ПИ-1-25',
  'ПИ-2-25',
  'ПОАС-1-25',
  'ПОАС-2-25',
  'ПОАС-3-25',
  'АСОИ-1-25',
  'ПИМ-1-25',
  EXTERNAL_GROUP,
];

const createInitialParticipants = (): Participant[] => [
  { id: 1, fullName: '' },
  { id: 2, fullName: '' },
];

const getFormValue = (formData: FormData, fieldName: string) =>
  String(formData.get(fieldName) ?? '').trim();

const secureRandomInt = (max: number) => {
  const buffer = new Uint32Array(1);

  globalThis.crypto.getRandomValues(buffer);

  return buffer[0] % max;
};

const randomDigits = (length: number) =>
  Array.from({ length }, () => secureRandomInt(10)).join('');

const generatePassword = (length = 6) => {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  return Array.from(
    { length },
    () => alphabet[secureRandomInt(alphabet.length)],
  ).join('');
};

const generateLogin = (teamName: string) => {
  const normalizedTeamName = teamName.toLowerCase().replace(/\s+/g, '');

  return `${normalizedTeamName || 'team'}${randomDigits(4)}`;
};

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Не удалось зарегистрировать команду. Попробуйте ещё раз.';
};

function App() {
  const [participants, setParticipants] = useState<Participant[]>(
    createInitialParticipants,
  );
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isExternalTeam = selectedGroup === EXTERNAL_GROUP;

  const clearFeedback = () => {
    if (isSubmitted) {
      setIsSubmitted(false);
    }

    if (formError) {
      setFormError(null);
    }
  };

  const addParticipant = () => {
    setParticipants((current) => [
      ...current,
      { id: Date.now(), fullName: '' },
    ]);
    clearFeedback();
  };

  const removeParticipant = (id: number) => {
    setParticipants((current) =>
      current.length <= 2
        ? current
        : current.filter((participant) => participant.id !== id),
    );
    clearFeedback();
  };

  const updateParticipant = (id: number, fullName: string) => {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === id ? { ...participant, fullName } : participant,
      ),
    );
    clearFeedback();
  };

  const validateForm = (
    teamName: string,
    groupName: string,
    externalPlace: string,
    leaderFullName: string,
    leaderTelegram: string,
    leaderPhone: string,
  ) => {
    if (!teamName) {
      return 'Введите название команды.';
    }

    if (!groupName) {
      return 'Выберите группу.';
    }

    if (isExternalTeam && !externalPlace) {
      return 'Укажите вашу организацию.';
    }

    if (!leaderFullName) {
      return 'Введите ФИО лидера.';
    }

    if (!leaderTelegram) {
      return 'Введите Telegram лидера.';
    }

    if (!leaderPhone) {
      return 'Введите номер телефона лидера.';
    }

    if (participants.length < 2) {
      return 'Добавьте минимум 2 участников.';
    }

    if (participants.some((participant) => !participant.fullName.trim())) {
      return 'Заполните ФИО каждого участника.';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const teamName = getFormValue(formData, 'team_name');
    const groupName = selectedGroup;
    const externalPlace = isExternalTeam
      ? getFormValue(formData, 'external_place')
      : '';
    const leaderFullName = getFormValue(formData, 'leader_full_name');
    const leaderTelegram = getFormValue(formData, 'telegram');
    const leaderPhone = getFormValue(formData, 'phone');
    const validationError = validateForm(
      teamName,
      groupName,
      externalPlace,
      leaderFullName,
      leaderTelegram,
      leaderPhone,
    );

    setIsSubmitted(false);
    setFormError(null);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { data: leader, error: leaderError } = await supabase
        .from('users')
        .insert({
          full_name: leaderFullName,
          login: generateLogin(teamName),
          password: generatePassword(),
          phone: leaderPhone,
          role: 'leader',
          telegram: leaderTelegram,
        })
        .select('id')
        .single();

      if (leaderError) {
        throw leaderError;
      }

      const leaderId = leader?.id;

      if (leaderId === undefined || leaderId === null) {
        throw new Error('Supabase не вернул id лидера.');
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          external_place: isExternalTeam ? externalPlace : null,
          group_name: groupName,
          leader_id: leaderId,
          team_name: teamName,
        })
        .select('id')
        .single();

      if (teamError) {
        throw teamError;
      }

      const teamId = team?.id;

      if (teamId === undefined || teamId === null) {
        throw new Error('Supabase не вернул id команды.');
      }

      const memberRows = participants.map((participant) => ({
        full_name: participant.fullName.trim(),
        team_id: teamId,
      }));
      const { error: membersError } = await supabase
        .from('team_members')
        .insert(memberRows);

      if (membersError) {
        throw membersError;
      }

      form.reset();
      setSelectedGroup('');
      setParticipants(createInitialParticipants());
      setIsSubmitted(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="site" id="top">
      <header className="site-header" aria-label="Основная навигация">
        <a className="brand" href="#top" aria-label="BashtUp 3">
          <span>
            <span>BashtUp</span>
          </span>
        </a>
        <nav className="nav-links">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="section-shell hero-content">
            <img
              className="hero-illustration"
              src={heroImage}
              alt="Иллюстрация рабочего пространства BashtUp"
            />
            <p className="hero-subtitle !font-regular relative -top-5">
              Хакатон колледжа Comtehno  
            </p>
            <h1 id="hero-title" className="!-mt-7">
              Basht<span>Up</span> III
            </h1>
            <Chip color="accent" variant="primary" size="lg" className="mt-3">
              Жөн гана башта | Просто начни
            </Chip>
          </div>
        </section>

        <section
          className="section about-section"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="section-shell two-column">
            <div>
              <Chip color="accent" variant="primary" size="lg">
                Что такое BashtUp?
              </Chip>
              <h2 id="about-title">Первый шаг от идеи к MVP</h2>
            </div>
            <div className="about-copy">
              <p>
                BashtUp - это ежегодный хакатон колледжа Comtehno, где
                студенты развивают стартап-мышление, учатся работать в команде
                и превращают идеи в реальные проекты.
              </p>
              <p>
                Цель хакатона - помочь участникам сделать первый шаг от идеи к
                MVP, получить опыт презентации проекта и поработать с
                менторами.
              </p>
              <div className="quick-stats" aria-label="Формат хакатона">
                <span>3 дня</span>
                <span>5 номинаций</span>
                <span>Менторы</span>
                <span>MVP</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="tracks" aria-labelledby="tracks-title">
          <div className="section-shell">
            <div className="section-heading">
              <Chip color="accent" variant="primary" size="lg">
                Направления проектов
              </Chip>
              <h2 id="tracks-title">
                Выберите проблему, которую хочется решить
              </h2>
            </div>
            <div
              className="slider-controls adaptive-controls"
              aria-label="Прокрутка направлений"
            >
              <button className="tracks-prev" type="button" aria-label="Назад">
                ‹
              </button>
              <button
                className="tracks-next"
                type="button"
                aria-label="Вперёд"
              >
                ›
              </button>
            </div>
            <Swiper
              className="hackathon-swiper track-swiper adaptive-swiper"
              modules={[Navigation]}
              navigation={{ prevEl: '.tracks-prev', nextEl: '.tracks-next' }}
              spaceBetween={14}
              slidesPerView={1.08}
              breakpoints={{
                620: { slidesPerView: 2 },
                841: { slidesPerView: 3, allowTouchMove: false },
              }}
            >
              {tracks.map((track, index) => (
                <SwiperSlide key={track.title}>
                  <article className="track-card">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h3>{track.title}</h3>
                    <p>{track.text}</p>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        <section
          className="section program-section"
          id="program"
          aria-labelledby="program-title"
        >
          <div className="section-shell">
            <div className="section-heading">
              <Chip color="accent" variant="primary" size="lg">
                Программа хакатона
              </Chip>
              <h2 id="program-title">
                Три дня, чтобы собрать команду и показать результат
              </h2>
            </div>
            <div className="program-grid">
              {programDays.map((day) => (
                <article className="day-card" key={day.day}>
                  <div className="day-head">
                    <div>
                      <p>{day.day}</p>
                      <h3>{day.date}</h3>
                    </div>
                    <Chip variant="soft" color="accent">
                      {day.theme}
                    </Chip>
                  </div>
                  <ul>
                    {day.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="awards" aria-labelledby="awards-title">
          <div className="section-shell">
            <div>
              <Chip color="accent" variant="primary" size="lg">
                Номинации
              </Chip>
              <h2 id="awards-title">Пять призовых мест</h2>
            </div>
            <div
              className="slider-controls adaptive-controls"
              aria-label="Прокрутка номинаций"
            >
              <button className="awards-prev" type="button" aria-label="Назад">
                ‹
              </button>
              <button
                className="awards-next"
                type="button"
                aria-label="Вперёд"
              >
                ›
              </button>
            </div>
            <Swiper
              className="hackathon-swiper awards-swiper adaptive-swiper mt-4"
              modules={[Navigation]}
              navigation={{ prevEl: '.awards-prev', nextEl: '.awards-next' }}
              spaceBetween={14}
              slidesPerView={1.08}
              breakpoints={{
                620: { slidesPerView: 2.2 },
                841: { slidesPerView: 5, allowTouchMove: false },
              }}
            >
              {awards.map((award) => (
                <SwiperSlide key={award.label}>
                  <div className="award-card !bg-backdrop/10">
                    <img src={award.img} alt="" />
                    <p>{award.label}</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        <section
          className="section past-section"
          id="past"
          aria-labelledby="past-title"
        >
          <div className="section-shell">
            <div className="section-heading">
              <Chip color="accent" variant="primary" size="lg">
                Прошлые хакатоны
              </Chip>
              <h2 id="past-title">История внутреннего хакатона</h2>
            </div>
            <div
              className="slider-controls"
              aria-label="Прокрутка прошлых хакатонов"
            >
              <button className="past-prev" type="button" aria-label="Назад">
                ‹
              </button>
              <button className="past-next" type="button" aria-label="Вперёд">
                ›
              </button>
            </div>
            <Swiper
              className="hackathon-swiper past-swiper"
              modules={[Navigation]}
              navigation={{ prevEl: '.past-prev', nextEl: '.past-next' }}
              spaceBetween={14}
              slidesPerView={1.08}
              breakpoints={{
                620: { slidesPerView: 2 },
                1001: { slidesPerView: 3 },
              }}
            >
              {pastEvents.map((event, index) => (
                <SwiperSlide key={`${event.title}-${event.year}-${index}`}>
                  <article className="past-card">
                    <img
                      src={event.image}
                      alt={`${event.title}: участники работают над проектом`}
                    />
                    {/* <div className="past-card-body">
                      <span>{event.year}</span>
                      <h3>{event.title}</h3>
                    </div> */}
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        <section
          className="section registration-section"
          id="register"
          aria-labelledby="register-title"
        >
          <div className="section-shell registration-layout">
            <div className="registration-copy">
                            <Chip color="accent" variant="primary" size="lg">
                Регистрация 
              </Chip>
        
              <h2 id="register-title">Зарегистрировать команду</h2>
              <p>
                Команда должна состоять минимум из двух участников. Лидер
                оставляет контакты, чтобы оргкомитет мог подтвердить участие и
                отправить детали по расписанию.
              </p>
            </div>

            <form
              className="registration-form"
              noValidate
              onChange={clearFeedback}
              onSubmit={handleSubmit}
            >
              <label>
                Название команды
                <input
                  disabled={isSubmitting}
                  name="team_name"
                  placeholder="Например, Zero Bugs"
                  type="text"
                />
              </label>

              <label>
                Группа
                <select
                  disabled={isSubmitting}
                  name="group_name"
                  onChange={(event) => setSelectedGroup(event.target.value)}
                  value={selectedGroup}
                >
                  <option value="">Выберите группу</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              {isExternalTeam && (
                <label>
                  Ваша организация
                  <input
                    disabled={isSubmitting}
                    name="external_place"
                    placeholder="Название организации"
                    type="text"
                  />
                </label>
              )}

              <div className="form-row">
                <label>
                  ФИО лидера
                  <input
                    disabled={isSubmitting}
                    name="leader_full_name"
                    placeholder="Фамилия Имя"
                    type="text"
                  />
                </label>
                <label>
                  Telegram лидера
                  <input
                    disabled={isSubmitting}
                    name="telegram"
                    placeholder="@username"
                    type="text"
                  />
                </label>
              </div>

              <label>
                Номер телефона лидера
                <input
                  disabled={isSubmitting}
                  name="phone"
                  placeholder="+996 ..."
                  type="tel"
                />
              </label>

              <div className="participants-head">
                <div>
                  <h3>Участники команды</h3>
                  <p>Минимум 2 участника</p>
                </div>
                <button
                  className="secondary-action"
                  disabled={isSubmitting}
                  onClick={addParticipant}
                  type="button"
                >
                  Добавить участника
                </button>
              </div>

              <div className="participants-list">
                {participants.map((participant, index) => (
                  <div className="participant-row" key={participant.id}>
                    <label>
                      ФИО участника {index + 1}
                      <input
                        disabled={isSubmitting}
                        name={`participant-${participant.id}`}
                        onChange={(event) =>
                          updateParticipant(participant.id, event.target.value)
                        }
                        placeholder="Фамилия Имя"
                        type="text"
                        value={participant.fullName}
                      />
                    </label>
                    <button
                      aria-label={`Удалить участника ${index + 1}`}
                      disabled={participants.length <= 2 || isSubmitting}
                      onClick={() => removeParticipant(participant.id)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>

              {formError && (
                <Alert className="form-alert" role="alert" status="danger">
                  <Alert.Content>
                    <Alert.Title>{formError}</Alert.Title>
                  </Alert.Content>
                </Alert>
              )}

              <button
                className="submit-action"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Регистрируем...' : 'Зарегистрировать команду'}
              </button>

              {isSubmitted && (
                <Alert className="form-alert" role="status" status="success">
                  <Alert.Content>
                    <Alert.Title>
                      Команда успешно зарегистрирована. Логин и пароль лидеру
                      выдаст администрация.
                    </Alert.Title>
                  </Alert.Content>
                </Alert>
              )}
            </form>
          </div>
        </section>

        <section
          className="section partners-section"
          aria-labelledby="partners-title"
        >
          <div className="section-shell">
            <div className="section-heading">
              <Chip color="accent" variant="primary" size="lg">
                Наши партнёры
              </Chip>
              <h2 id="partners-title">
                Вместе поддерживаем идеи студентов
              </h2>
            </div>
            <div className="partner-grid">
              {partnerLogos.map((partner) => (
                <div className="partner-logo !bg-white/20" key={partner.mark}>
                  <div className="flex items-center gap-3 mb-3">
                    <img className="w-[70px]" src={partner.img} alt="" />
                    <h3 className="font-bold text-3xl">{partner.mark}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="section-shell text-center flex flex-col md:flex-row items-center justify-center gap-2">
          Сайт разработан компанией{' '}
          <a
            className="flex items-center !text-sky-600 !font-medium gap-0.5"
            href="https://bashtup.com/"
          >
            <img src="/bashtup.svg" className="w-5 h-5" alt="" />
            Bashtup
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
