// Get navigation elements
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

// Mobile navigation menu
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {

    const isOpen = nav.classList.toggle('open');

    menuButton.setAttribute('aria-expanded', String(isOpen));

    menuButton.setAttribute(
      'aria-label',
      isOpen ? 'Close navigation' : 'Open navigation'
    );

    menuButton.textContent = isOpen ? '×' : '☰';

  });

  // Close navigation after clicking a link
  document.querySelectorAll('.nav-links a').forEach(link => {

    link.addEventListener('click', () => {

      nav.classList.remove('open');

      menuButton.setAttribute('aria-expanded', 'false');

      menuButton.setAttribute('aria-label', 'Open navigation');

      menuButton.textContent = '☰';

    });
  });
}

// Automatically update copyright year
const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

// Multi-step Supabase interest form
const interestForm = document.getElementById('interest-form');
if (interestForm) {
  const steps = Array.from(interestForm.querySelectorAll('.application-step'));
  const progressItems = Array.from(
    document.querySelectorAll('.application-progress li')
  );
  const backButton = interestForm.querySelector('[data-step-back]');
  const nextButton = interestForm.querySelector('[data-step-next]');
  const submitButton = interestForm.querySelector('[data-step-submit]');
  const errorMessage = interestForm.querySelector('.wizard-error');
  const completePanel = document.getElementById('application-complete');
  const configError = document.getElementById('supabase-config-error');
  const submissionStatus = interestForm.querySelector('.submission-status');
  const filePaths = {};
  const config = window.SCHOLARBRIDGE_SUPABASE_CONFIG;
  const isConfigured = config
    && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url)
    && config.anonKey
    && !config.anonKey.includes('YOUR_SUPABASE_');
  const supabaseClient = isConfigured
    && window.supabase
    && typeof window.supabase.createClient === 'function'
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;
  let currentStep = 0;
  let submissionId = null;
  let recordSaved = false;
  const uploadedDocuments = new Set();
  const allowedDocumentTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  if (!supabaseClient) {
    configError.textContent =
      'Supabase is not connected yet. Add your project URL and publishable/anon key to supabase-config.js, then run Backend/supabase-schema.sql in your Supabase SQL Editor.';
    configError.hidden = false;
  }

  const updateStep = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });

    progressItems.forEach((item, index) => {
      if (index === currentStep) {
        item.classList.add('is-current');
        item.setAttribute('aria-current', 'step');
      } else {
        item.classList.remove('is-current');
        item.removeAttribute('aria-current');
      }

      item.classList.toggle('is-complete', index < currentStep);
    });

    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    errorMessage.hidden = true;
  };

  const validateCurrentStep = () => {
    const fields = Array.from(
      steps[currentStep].querySelectorAll('input, select, textarea')
    );
    const invalidField = fields.find(field => !field.checkValidity());

    if (invalidField) {
      invalidField.reportValidity();
      return false;
    }

    const files = Array.from(
      steps[currentStep].querySelectorAll('input[type="file"]')
    ).flatMap(input => Array.from(input.files));
    const oversizedFile = files.find(file => file.size > 5 * 1024 * 1024);

    if (oversizedFile) {
      errorMessage.textContent = `${oversizedFile.name} is larger than 5 MB. Choose a smaller file.`;
      errorMessage.hidden = false;
      return false;
    }

    const unsupportedFile = files.find(file => !allowedDocumentTypes.has(file.type));
    if (unsupportedFile) {
      errorMessage.textContent =
        `${unsupportedFile.name} is not a supported document. Choose a PDF, DOC or DOCX file.`;
      errorMessage.hidden = false;
      return false;
    }

    return true;
  };

  const saveProgress = async step => {
    if (!supabaseClient) {
      throw new Error('Supabase is not connected. Add the project settings and run the database setup SQL first.');
    }

    if (!submissionId) {
      if (!window.crypto || typeof window.crypto.randomUUID !== 'function') {
        throw new Error('Secure ID generation is unavailable. Open this site using HTTPS or localhost.');
      }
      submissionId = window.crypto.randomUUID();
    }

    const formData = new FormData(interestForm);
    const data = {
      name: formData.get('name').trim(),
      email: formData.get('email').trim(),
      phone: formData.get('phone').trim() || null
    };

    if (step >= 2) {
      Object.assign(data, {
        field: formData.get('field'),
        study_level: formData.get('level'),
        course: formData.get('course').trim() || null,
        destination: formData.get('destination').trim() || null
      });
    }

    if (step >= 3) {
      Object.assign(data, {
        cv_path: filePaths.cv || null,
        transcript_path: filePaths.transcript || null
      });
    }

    if (step === 4) {
      data.payment_reference = formData.get('payment_reference').trim();
    }

    const { error } = await supabaseClient
      .from('scholarship_application_progress')
      .insert({
        application_id: submissionId,
        step,
        data
      });

    if (error) {
      throw new Error(`Could not save step ${step}: ${error.message}`);
    }
  };

  const moveToNextStep = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    nextButton.disabled = true;
    submissionStatus.textContent = 'Saving this step...';
    errorMessage.hidden = true;

    try {
      await saveProgress(currentStep + 1);
      currentStep += 1;
      updateStep();
      steps[currentStep].querySelector('h2').focus();
    } catch (error) {
      errorMessage.textContent = error instanceof Error
        ? error.message
        : 'An unexpected error occurred while saving this step.';
      errorMessage.hidden = false;
      errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      nextButton.disabled = false;
      submissionStatus.textContent = '';
    }
  };

  nextButton.addEventListener('click', moveToNextStep);

  backButton.addEventListener('click', () => {
    currentStep -= 1;
    updateStep();
    steps[currentStep].querySelector('h2').focus();
  });

  interestForm.addEventListener('submit', event => {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    if (!supabaseClient) {
      configError.hidden = false;
      configError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitButton.disabled = true;
    submissionStatus.textContent = 'Saving your interest, documents and payment reference...';
    errorMessage.hidden = true;

    const safeFileName = fileName =>
      fileName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);

    (async () => {
      try {
        if (!submissionId) {
          if (!window.crypto || typeof window.crypto.randomUUID !== 'function') {
            throw new Error('Secure ID generation is unavailable. Open this site using HTTPS or localhost.');
          }
          submissionId = window.crypto.randomUUID();
        }

        for (const input of interestForm.querySelectorAll('input[type="file"]')) {
          const file = input.files[0];
          if (!file || uploadedDocuments.has(input.name)) {
            continue;
          }

          const path = `${submissionId}/${input.name}-${safeFileName(file.name)}`;
          const { error } = await supabaseClient
            .storage
            .from('scholarship-documents')
            .upload(path, file, { contentType: file.type, upsert: false });

          if (error) {
            const label = input.labels[0]?.textContent.trim() || input.name;
            throw new Error(`${label} could not be uploaded: ${error.message}`);
          }
          uploadedDocuments.add(input.name);
          filePaths[input.name] = path;
        }

        await saveProgress(3);
        await saveProgress(4);

        if (!recordSaved) {
          const formData = new FormData(interestForm);
          const { error } = await supabaseClient
            .from('scholarship_interests')
            .insert({
              id: submissionId,
              application_id: submissionId,
              full_name: formData.get('name').trim(),
              email: formData.get('email').trim(),
              phone: formData.get('phone').trim() || null,
              field: formData.get('field'),
              study_level: formData.get('level'),
              course: formData.get('course').trim() || null,
              destination: formData.get('destination').trim() || null,
              cv_path: filePaths.cv || null,
              transcript_path: filePaths.transcript || null,
              payment_reference: formData.get('payment_reference').trim()
            });

          if (error) {
            throw new Error(`Your steps were saved, but the final record could not be completed: ${error.message}`);
          }
          recordSaved = true;
        }

        interestForm.reset();
        interestForm.hidden = true;
        submissionStatus.textContent = '';
        completePanel.hidden = false;
        completePanel.querySelector('h2').focus();
      } catch (error) {
        errorMessage.textContent = error instanceof Error
          ? error.message
          : 'An unexpected error occurred while saving. Please try again.';
        errorMessage.hidden = false;
        submissionStatus.textContent = '';
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } finally {
        submitButton.disabled = false;
      }
    })();
  });

  updateStep();
}