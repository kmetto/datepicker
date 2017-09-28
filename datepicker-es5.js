'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (root, returnDatepicker) {
  if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') return module.exports = returnDatepicker();
  if (typeof define === 'function' && define.amd) return define(function () {
    return returnDatepicker();
  });
  return root.datepicker = returnDatepicker();
})(undefined, function () {
  'use strict';

  var datepickers = [];
  var listeners = ['click', 'focusin', 'keydown', 'input'];
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var sides = {
    t: 'top',
    r: 'right',
    b: 'bottom',
    l: 'left'
  };

  /*
   *
   */
  function Datepicker(selector, options) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    var parent = el.parentElement;

    options = sanitizeOptions(options || defaults(), el, selector);

    var calendar = document.createElement('div');
    var _options = options,
        startDate = _options.startDate,
        dateSelected = _options.dateSelected;

    var noPosition = el === document.body || el === document.querySelector('html');
    var instance = {
      // The calendar will be positioned relative to this element (except when 'body' or 'html').
      el: el,

      // The element that datepicker will be attached to.
      parent: parent,

      // Indicates whether to use a <input> element or not as the calendars anchor.
      nonInput: el.nodeName !== 'INPUT',

      // Flag indicating if `el` is 'body' or 'html' for `calculatePosition`.
      noPosition: noPosition,

      // Calendar position relative to `el`.
      position: noPosition ? false : options.position,

      // Date obj used to indicate what month to start the calendar on.
      startDate: startDate,

      // Starts the calendar with a date selected.
      dateSelected: dateSelected,

      // Low end of selectable dates.
      minDate: options.minDate,

      // High end of selectable dates.
      maxDate: options.maxDate,

      // Disabled the ability to select days on the weekend.
      noWeekends: !!options.noWeekends,

      // The element our calendar is constructed in.
      calendar: calendar,

      // Month of `startDate` or `dateSelected` (as a number).
      currentMonth: (startDate || dateSelected).getMonth(),

      // Month name in plain english.
      currentMonthName: (options.months || months)[(startDate || dateSelected).getMonth()],

      // Year of `startDate` or `dateSelected`.
      currentYear: (startDate || dateSelected).getFullYear(),

      // Method to programatically set the calendar's date.
      setDate: setDate,

      // Method that removes the calendar from the DOM along with associated events.
      remove: remove,

      // Callback fired when a date is selected - triggered in `selectDay`.
      onSelect: options.onSelect,

      // Callback fired when the calendar is shown - triggered in `classChangeObserver`.
      onShow: options.onShow,

      // Callback fired when the calendar is hidden - triggered in `classChangeObserver`.
      onHide: options.onHide,

      // Callback fired when the month is changed - triggered in `changeMonthYear`.
      onMonthChange: options.onMonthChange,

      // Function to customize the date format updated on <input> elements - triggered in `setElValues`.
      formatter: options.formatter,

      // Custom labels for months.
      months: options.months,

      // Custom labels for days.
      days: options.days,

      // Custom overlay placeholder.
      overlayPlaceholder: options.overlayPlaceholder || '4-digit year',

      // Custom overlay submit button.
      overlayButton: options.overlayButton || 'Submit',

      // Disable the datepicker on mobile devices.
      // Allows the use of native datepicker if the input type is 'date'.
      disableMobile: options.disableMobile,

      // Used in conjuntion with `disableMobile` above within `oneHandler`.
      isMobile: 'ontouchstart' in window
    };

    // Initially populate the <input> field / set attributes on the `el`.
    if (dateSelected) setElValues(el, instance);

    calendar.classList.add('qs-datepicker');
    calendar.classList.add('qs-hidden');
    datepickers.push(el);
    calendarHtml(startDate || dateSelected, instance);

    classChangeObserver(calendar, instance);
    listeners.forEach(function (e) {
      // Declared at the top.
      window.addEventListener(e, oneHandler.bind(instance));
    });

    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(calendar);

    return instance;
  }

  /*
   *  Will run checks on the provided options object to ensure correct types.
   *  Returns an options object if everything checks out.
   */
  function sanitizeOptions(options, el) {
    // An invalid selector or non-DOM node has been provided.
    if (!el) throw new Error('An invalid selector or non-DOM node has been provided.');

    // Check if the provided element already has a datepicker attached.
    if (datepickers.includes(el)) throw new Error('A datepicker already exists on that element.');

    var position = options.position,
        maxDate = options.maxDate,
        minDate = options.minDate,
        dateSelected = options.dateSelected,
        formatter = options.formatter,
        customMonths = options.customMonths,
        customDays = options.customDays,
        overlayPlaceholder = options.overlayPlaceholder,
        overlayButton = options.overlayButton;

    // Ensure the accuracy of `options.position` & call `establishPosition`.

    if (position) {
      var found = ['tr', 'tl', 'br', 'bl'].some(function (dir) {
        return position === dir;
      });
      var msg = '"options.position" needs to be one of the following: tl, tr, bl, or br.';

      if (!found) throw new Error(msg);
      options.position = establishPosition(position);
    } else {
      options.position = establishPosition('bl');
    }

    // Check that various options have been provided a JavaScript Date object.
    // If so, strip the time from those dates (for accurate future comparisons).
    ['startDate', 'dateSelected', 'minDate', 'maxDate'].forEach(function (date) {
      if (options[date]) {
        if (!dateCheck(options[date]) || isNaN(+options[date])) {
          throw new TypeError('"options.' + date + '" needs to be a valid JavaScript Date object.');
        }

        // Strip the time from the date.
        options[date] = stripTime(options[date]);
      }
    });

    options.startDate = options.startDate || options.dateSelected || stripTime(new Date());
    options.formatter = typeof formatter === 'function' ? formatter : null;

    if (maxDate < minDate) {
      throw new Error('"maxDate" in options is less than "minDate".');
    }

    if (dateSelected) {
      if (minDate > dateSelected) {
        throw new Error('"dateSelected" in options is less than "minDate".');
      }

      if (maxDate < dateSelected) {
        throw new Error('"dateSelected" in options is greater than "maxDate".');
      }
    }

    // Callbacks.
    ['onSelect', 'onShow', 'onHide', 'onMonthChange'].forEach(function (fxn) {
      options[fxn] = typeof options[fxn] === 'function' && options[fxn];
    });

    // Custom labels for months & days.
    [customMonths, customDays].forEach(function (custom, i) {
      if (custom === undefined) return;

      var errorMsgs = ['"customMonths" must be an array with 12 strings.', '"customDays" must be an array with 7 strings.'];
      var wrong = [{}.toString.call(custom) !== '[object Array]', custom.length !== (i ? 7 : 12), custom.some(function (item) {
        return typeof item !== 'string';
      })].some(function (thing) {
        return thing;
      });

      if (wrong) throw new Error(errorMsgs[i]);

      options[i ? 'days' : 'months'] = custom;
    });

    // Custom text for overlay placeholder & button.
    [overlayPlaceholder, overlayButton].forEach(function (thing, i) {
      if (thing && typeof thing === 'string') {
        if (i) {
          // Button.
          options.overlayButton = thing;
        } else {
          // Placeholder.
          options.overlayPlaceholder = thing;
        }
      }
    });

    return options;
  }

  /*
   *  Returns an object containing all the default settings.
   */
  function defaults() {
    return {
      startDate: stripTime(new Date()),
      position: 'bl'
    };
  }

  /*
   *  Returns an object representing the position of the calendar
   *  relative to the calendars <input> element.
   */
  function establishPosition(position) {
    var obj = {};

    obj[sides[position[0]]] = 1;
    obj[sides[position[1]]] = 1;

    return obj;
  }

  /*
   *  Populates `calendar.innerHTML` with the contents
   *  of the calendar controls, month, and overlay.
   */
  function calendarHtml(date, instance) {
    var calendar = instance.calendar;

    var controls = createControls(date, instance);
    var month = createMonth(date, instance);
    var overlay = createOverlay(instance);
    calendar.innerHTML = controls + month + overlay;
  }

  /*
   *  Creates the calendar controls.
   *  Returns a string representation of DOM elements.
   */
  function createControls(date, instance) {
    return '\n      <div class="qs-controls">\n        <div class="qs-arrow qs-left"></div>\n        <div class="qs-month-year">\n          <span class="qs-month">' + (instance.months || months)[date.getMonth()] + '</span>\n          <span class="qs-year">' + date.getFullYear() + '</span>\n        </div>\n        <div class="qs-arrow qs-right"></div>\n      </div>\n    ';
  }

  /*
   *  Creates the calendar month structure.
   *  Returns a string representation of DOM elements.
   */
  function createMonth(date, instance) {
    var minDate = instance.minDate,
        maxDate = instance.maxDate,
        dateSelected = instance.dateSelected,
        currentYear = instance.currentYear,
        currentMonth = instance.currentMonth,
        noWeekends = instance.noWeekends;

    // Same year, same month?

    var today = new Date();
    var isThisMonth = today.toJSON().slice(0, 7) === date.toJSON().slice(0, 7);

    // Calculations for the squares on the calendar.
    var copy = new Date(new Date(date).setDate(1));
    var offset = copy.getDay(); // Preceding empty squares.
    copy.setMonth(copy.getMonth() + 1);
    copy.setDate(0); // Last day in the current month.
    var daysInMonth = copy.getDate(); // Squares with a number.

    // Will contain string representations of HTML for the squares.
    var calendarSquares = [];

    // Fancy calculations for the total # of squares.
    var totalSquares = ((offset + daysInMonth) / 7 | 0) * 7;
    totalSquares += (offset + daysInMonth) % 7 ? 7 : 0;

    for (var i = 1; i <= totalSquares; i++) {
      var weekday = (instance.days || days)[(i - 1) % 7];
      var num = i - offset;
      var otherClass = '';
      var span = '<span class="qs-num">' + num + '</span>';
      var thisDay = new Date(currentYear, currentMonth, num);
      var isEmpty = num < 1 || num > daysInMonth;

      // Empty squares.
      if (isEmpty) {
        otherClass = 'qs-empty';
        span = '';

        // Disabled & current squares.
      } else {
        var disabled = minDate && thisDay < minDate || maxDate && thisDay > maxDate;
        var weekdays = instance.days || days;
        var sat = weekdays[6];
        var sun = weekdays[0];
        var weekend = weekday === sat || weekday === sun;
        var currentValidDay = isThisMonth && !disabled && num === today.getDate();

        disabled = disabled || noWeekends && weekend;
        otherClass = disabled ? 'qs-disabled' : currentValidDay ? 'qs-current' : '';
      }

      // Currently selected day.
      if (+thisDay === +dateSelected && !isEmpty) otherClass += ' qs-active';

      calendarSquares.push('<div class="qs-square qs-num ' + weekday + ' ' + otherClass + '">' + span + '</div>');
    }

    // Add the header row of days of the week.
    var daysAndSquares = (instance.days || days).map(function (day) {
      return '<div class="qs-square qs-day">' + day + '</div>';
    }).concat(calendarSquares);

    // Throw error...
    // The # of squares on the calendar should ALWAYS be a multiple of 7.
    if (daysAndSquares.length % 7 !== 0) {
      var msg = 'Calendar not constructed properly. The # of squares should be a multiple of 7.';
      throw new Error(msg);
    }

    // Wrap it all in a tidy div.
    daysAndSquares.unshift('<div class="qs-squares">');
    daysAndSquares.push('</div>');
    return daysAndSquares.join('');
  }

  /*
   *  Creates the overlay for users to
   *  manually navigate to a month & year.
   */
  function createOverlay(instance) {
    var overlayPlaceholder = instance.overlayPlaceholder,
        overlayButton = instance.overlayButton;


    return '\n      <div class="qs-overlay qs-hidden">\n        <div class="qs-close">&#10005;</div>\n        <input type="number" class="qs-overlay-year" placeholder="' + overlayPlaceholder + '" />\n        <div class="qs-submit qs-disabled">' + overlayButton + '</div>\n      </div>\n    ';
  }

  /*
   *  Highlights the selected date.
   *  Calls `setElValues`.
   */
  function selectDay(target, instance) {
    var currentMonth = instance.currentMonth,
        currentYear = instance.currentYear,
        calendar = instance.calendar,
        el = instance.el,
        onSelect = instance.onSelect;

    var active = calendar.querySelector('.qs-active');
    var num = target.textContent;

    // Keep track of the currently selected date.
    instance.dateSelected = new Date(currentYear, currentMonth, num);

    // Re-establish the active (highlighted) date.
    if (active) active.classList.remove('qs-active');
    target.classList.add('qs-active');

    // Populate the <input> field (or not) with a readble value
    // and store the individual date values as attributes.
    setElValues(el, instance);

    // Hide the calendar after a day has been selected.
    calendar.classList.add('qs-hidden');

    if (onSelect) instance.onSelect(instance);
  }

  /*
   *  Populates the <input> fields with a readble value
   *  and stores the individual date values as attributes.
   */
  function setElValues(el, instance) {
    if (instance.nonInput) return;
    if (instance.formatter) return instance.formatter(el, instance.dateSelected);
    el.value = instance.dateSelected.toDateString();
  }

  /*
   *  2 Scenarios:
   *
   *  Updates `this.currentMonth` & `this.currentYear` based on right or left arrows.
   *  Creates a `newDate` based on the updated month & year.
   *  Calls `calendarHtml` with the updated date.
   *
   *  Changes the calendar to a different year
   *  from a users manual input on the overlay.
   *  Calls `calendarHtml` with the updated date.
   */
  function changeMonthYear(classList, instance, year) {
    // Overlay.
    if (year) {
      instance.currentYear = year;

      // Month change.
    } else {
      instance.currentMonth += classList.contains('qs-right') ? 1 : -1;

      if (instance.currentMonth === 12) {
        instance.currentMonth = 0;
        instance.currentYear++;
      } else if (instance.currentMonth === -1) {
        instance.currentMonth = 11;
        instance.currentYear--;
      }
    }

    var newDate = new Date(instance.currentYear, instance.currentMonth, 1);
    calendarHtml(newDate, instance);
    instance.currentMonthName = (instance.months || months)[instance.currentMonth];
    instance.onMonthChange && year && instance.onMonthChange(instance);
  }

  /*
   *  Sets the `style` attribute on the calendar after doing calculations.
   */
  function calculatePosition(instance) {
    // Don't position the calendar in reference to the <body> or <html> elements.
    if (instance.noPosition) return;

    var el = instance.el,
        calendar = instance.calendar,
        position = instance.position,
        parent = instance.parent;
    var top = position.top,
        right = position.right;


    var parentRect = parent.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();
    var calRect = calendar.getBoundingClientRect();
    var offset = elRect.top - parentRect.top + parent.scrollTop;

    var style = '\n      top:' + (offset - (top ? calRect.height : elRect.height * -1)) + 'px;\n      left:' + (elRect.left - parentRect.left + (right ? elRect.width - calRect.width : 0)) + 'px;\n    ';

    calendar.setAttribute('style', style);
  }

  /*
   *  Method that programatically sets the date.
   */
  function setDate(date) {
    if (!dateCheck(date)) throw new TypeError('`setDate` needs a JavaScript Date object.');
    date = stripTime(date); // Remove the time.
    this.currentYear = date.getFullYear();
    this.currentMonth = date.getMonth();
    this.currentMonthName = (this.months || months)[date.getMonth()];
    this.dateSelected = date;
    setElValues(this.el, this);
    calendarHtml(date, this);
  }

  function dateCheck(date) {
    return {}.toString.call(date) === '[object Date]';
  }

  /*
   *  Takes a date and returns a date stripped of its time (hh:mm:ss:ms).
   */
  function stripTime(date) {
    return new Date(date.toDateString());
  }

  /*
   *  Removes all event listeners added by the constructor.
   *  Removes the current instance from the array of instances.
   */
  function remove() {
    var calendar = this.calendar,
        observer = this.observer,
        parent = this.parent;

    // Remove event listeners (declared at the top).

    listeners.forEach(function (e) {
      window.removeEventListener(e, oneHandler);
    });

    calendar.remove();
    observer.disconnect(); // Stop the mutationObserver. https://goo.gl/PgFCEr

    // Remove styling done to the parent element.
    if (calendar.hasOwnProperty('parentStyle')) parent.style.position = '';

    // Remove this datepicker's `el` from the list.
    var index = datepickers.indexOf(this.el);
    if (index > -1) datepickers.splice(index, 1);
  }

  /////////////////////
  // EVENT FUNCTIONS //
  /////////////////////

  /*
   *  Mutation observer
   *  1. Will trigger the user-provided `onShow` callback when the calendar is shown.
   *  2. Will call `calculatePosition` when calendar is shown.
   */
  function classChangeObserver(calendar, instance) {
    instance.observer = new MutationObserver(function (mutations, thing) {
      // Calendar has been shown.
      if (mutations[0].oldValue.includes('qs-hidden')) {
        calculatePosition(instance);
        instance.onShow && instance.onShow(instance);

        // Calendar has been hidden.
      } else {
        instance.onHide && instance.onHide(instance);
      }
    });

    instance.observer.observe(calendar, {
      attributes: 1,
      attributeFilter: ['class'],
      attributeOldValue: 1
    });
  }

  /*
   *  Handles `click` events when the calendar's `el` is an <input>.
   *  Handles `focusin` events for all other types of `el`'s.
   *  Handles `keyup` events when tabbing.
   *  Handles `input` events for the overlay.
   */
  function oneHandler(e) {
    // Add `e.path` if it doesn't exist.
    if (!e.path) {
      var node = e.target;
      var _path = [];

      while (node !== document) {
        _path.push(node);
        node = node.parentNode;
      }

      e.path = _path;
    }

    var type = e.type,
        path = e.path,
        target = e.target;


    if (this.isMobile && this.disableMobile) return;

    var calClasses = this.calendar.classList;
    var hidden = calClasses.contains('qs-hidden');
    var onCal = path.includes(this.calendar);

    // Enter, ESC, or tabbing.
    if (type === 'keydown') {
      var overlay = this.calendar.querySelector('.qs-overlay');

      // Pressing enter while the overlay is open.
      if (e.which === 13 && !overlay.classList.contains('qs-hidden')) {
        e.stopPropagation(); // Avoid submitting <form>'s.
        return overlayYearEntry(e, target, this);

        // ESC key pressed.
      } else if (e.which === 27) {
        return toggleOverlay(this.calendar, true, this);

        // Tabbing.
      } else if (e.which !== 9) {
        return;
      }
    }

    // Only pay attention to `focusin` events if the calendar's el is an <input>.
    // `focusin` bubbles, `focus` does not.
    if (type === 'focusin') return target === this.el && calClasses.remove('qs-hidden');

    // Calendar's el is 'html' or 'body'.
    // Anything but the calendar was clicked.
    if (this.noPosition) {
      onCal ? calendarClicked(this) : calClasses.toggle('qs-hidden');

      // When the calendar is hidden...
    } else if (hidden) {
      target === this.el && calClasses.remove('qs-hidden');

      // Clicked on the calendar.
    } else if (type === 'click' && onCal) {
      calendarClicked(this);

      // Typing in the overlay year input.
    } else if (type === 'input') {
      overlayYearEntry(e, target, this);
    } else {
      target !== this.el && calClasses.add('qs-hidden');
    }

    function calendarClicked(instance) {
      var calendar = instance.calendar;

      var classList = target.classList;
      var monthYear = calendar.querySelector('.qs-month-year');
      var isClose = classList.contains('qs-close');

      // A number was clicked.
      if (classList.contains('qs-num')) {
        var targ = target.nodeName === 'SPAN' ? target.parentNode : target;
        var doNothing = ['qs-disabled', 'qs-active', 'qs-empty'].some(function (cls) {
          return targ.classList.contains(cls);
        });

        !doNothing && selectDay(targ, instance);

        // Month arrows were clicked.
      } else if (classList.contains('qs-arrow')) {
        changeMonthYear(classList, instance);

        // Month / year was clicked OR closing the overlay.
      } else if (path.includes(monthYear) || isClose) {
        toggleOverlay(calendar, isClose, instance);

        // Overlay submit button clicked.
      } else if (target.classList.contains('qs-submit')) {
        var input = calendar.querySelector('.qs-overlay-year');
        overlayYearEntry(e, input, instance);
      }
    }

    function toggleOverlay(calendar, closing, instance) {
      ['.qs-overlay', '.qs-controls', '.qs-squares'].forEach(function (cls, i) {
        calendar.querySelector(cls).classList.toggle(i ? 'qs-blur' : 'qs-hidden');
      });

      var overlayYear = calendar.querySelector('.qs-overlay-year');
      closing ? overlayYear.value = '' : overlayYear.focus();
    }

    function overlayYearEntry(e, input, instance) {
      // Fun fact: 275760 is the largest year for a JavaScript date. #TrialAndError

      var badDate = isNaN(new Date().setFullYear(input.value || undefined));

      // Enter has been pressed OR submit was clicked.
      if (e.which === 13 || e.type === 'click') {
        if (badDate || input.classList.contains('qs-disabled')) return;
        changeMonthYear(null, instance, input.value);

        // Enable / disabled the submit button.
      } else {
        var submit = instance.calendar.querySelector('.qs-submit');
        submit.classList[badDate ? 'add' : 'remove']('qs-disabled');
      }
    }
  }

  return Datepicker;
});