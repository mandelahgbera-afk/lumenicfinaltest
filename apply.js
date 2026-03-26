/**
 * LUMENIC DATA — Apply Form Handler
 * =====================================
 * Multi-step form with complete validation, drag & drop uploads,
 * file size validation, error recovery, and offline detection.
 * 
 * This is a PRODUCTION-READY implementation with extensive error handling.
 */

'use strict';

(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForm);
  } else {
    initForm();
  }

  function initForm() {
    console.log('[Apply] Initializing application form...');
    
    // ════════════════════════════════════════════════════════════
    // 1. STATE & CONFIG
    // ════════════════════════════════════════════════════════════
    let currentStep = 1;
    let isSubmitting = false;
    const totalSteps = 4;
    
    const form = document.querySelector('.apply-form-area');
    if (!form) {
      console.error('[Apply] ✗ Form element not found');
      return;
    }

    // File input configuration - must match backend
    const FILE_FIELDS = ['a-selfie', 'a-id-photo-front', 'a-id-photo-back', 'a-cv'];
    
    console.log('[Apply] Form initialized successfully');
    console.log('[Apply] File fields:', FILE_FIELDS);

    // ════════════════════════════════════════════════════════════
    // 2. STEP NAVIGATION
    // ════════════════════════════════════════════════════════════
    function goToStep(step) {
      if (step < 1 || step > totalSteps + 1) return;

      // Hide all steps
      document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.step-nav-item').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.mobile-step-dot').forEach(el => el.classList.remove('active'));
      
      const successState = document.getElementById('success-state');
      if (successState) successState.classList.remove('active');

      if (step <= totalSteps) {
        // Show current step
        const stepEl = document.getElementById(`step-${step}`);
        if (stepEl) stepEl.classList.add('active');

        const navItem = document.querySelector(`[data-step="${step}"]`);
        if (navItem) navItem.classList.add('active');

        const dot = document.querySelector(`[data-dot="${step}"]`);
        if (dot) dot.classList.add('active');

        // Update progress
        const progressPercent = (step / totalSteps) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = progressPercent + '%';

        // Scroll to form
        setTimeout(() => {
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        // Show success state
        if (successState) successState.classList.add('active');
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = '100%';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      currentStep = step;
    }

    // ════════════════════════════════════════════════════════════
    // 3. FORM VALIDATION
    // ════════════════════════════════════════════════════════════
    function validateStep(step) {
      const stepEl = document.getElementById(`step-${step}`);
      if (!stepEl) return false;

      const requiredFields = stepEl.querySelectorAll('[required]');
      let isValid = true;
      let firstInvalid = null;

      requiredFields.forEach(field => {
        let valid = true;
        const value = field.value?.trim() || '';

        // Check file inputs (required files)
        if (field.type === 'file') {
          if (!field.files || !field.files[0]) {
            valid = false;
            const zone = field.closest('.upload-zone');
            const fieldName = zone?.getAttribute('data-field-name') || 'Required file';
            showToast(`${fieldName} is required`, true);
          } else if (field.getAttribute('data-size-error') === 'true') {
            valid = false;
            showToast('Please fix file size errors before proceeding', true);
          }
        }
        // Check if empty (for non-file, non-checkbox fields)
        else if (!value && field.type !== 'checkbox' && field.type !== 'radio') {
          valid = false;
        }

        // Type-specific validation
        if (valid && value) {
          if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              valid = false;
              showToast('Please enter a valid email address', true);
            }
          } else if (field.id === 'a-phone') {
            const digits = value.replace(/\D/g, '');
            if (digits.length < 10) {
              valid = false;
              showToast('Please enter a valid phone number (at least 10 digits)', true);
            }
          } else if (field.id === 'a-ssn') {
            const digits = value.replace(/\D/g, '');
            if (digits.length !== 9) {
              valid = false;
              showToast('SSN must be exactly 9 digits', true);
            }
          } else if (field.id === 'a-linkedin' && value && !value.includes('linkedin.com')) {
            valid = false;
            showToast('Please enter a valid LinkedIn URL', true);
          } else if (field.id === 'a-location' && value) {
            const locationRegex = /^[a-zA-Z\s,.\-'']{2,100}$/;
            if (!locationRegex.test(value)) {
              valid = false;
              showToast('Please enter a valid location (city, state/country)', true);
            }
          }
        }

        // Checkbox validation
        if (field.type === 'checkbox' && field.required && !field.checked) {
          valid = false;
        }

        if (!valid) {
          field.classList.add('field-invalid');
          field.style.borderColor = '#c0392b';
          field.style.backgroundColor = 'rgba(192,57,43,0.05)';
          isValid = false;
          if (!firstInvalid) firstInvalid = field;
        } else {
          field.classList.remove('field-invalid');
          field.style.borderColor = '';
          field.style.backgroundColor = '';
        }
      });

      // Check radio button groups
      const radioGroups = new Set();
      stepEl.querySelectorAll('input[type="radio"][required]').forEach(radio => {
        radioGroups.add(radio.name);
      });
      
      radioGroups.forEach(groupName => {
        const checked = stepEl.querySelector(`input[name="${groupName}"]:checked`);
        if (!checked) {
          isValid = false;
          showToast('Please select all required options', true);
        }
      });

      if (!isValid && firstInvalid) {
        showToast('Please fill all required fields correctly', true);
        setTimeout(() => {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus({ preventScroll: true });
        }, 150);
      }

      return isValid;
    }

    // ════════════════════════════════════════════════════════════
    // 4. FILE UPLOAD HANDLING
    // ════════════════════════════════════════════════════════════
    document.querySelectorAll('.upload-zone').forEach(zone => {
      const input = zone.querySelector('input[type="file"]');
      if (!input) return;

      // Prevent default drag behavior
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Drag highlighting
      ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, () => {
          zone.style.borderColor = 'var(--ink)';
          zone.style.backgroundColor = 'rgba(0,0,0,0.02)';
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, () => {
          zone.style.borderColor = '';
          zone.style.backgroundColor = '';
        });
      });

      // Drop handler
      zone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 1) {
          showToast('Please select only one file per upload area', true);
          return;
        }
        if (files.length) {
          const file = files[0];
          const maxSize = parseInt(zone.getAttribute('data-max-size')) || 4194304;
          const fieldName = zone.getAttribute('data-field-name') || 'File';
          
          // Pre-check file size before adding
          if (file.size > maxSize) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            const maxMB = (maxSize / 1024 / 1024).toFixed(1);
            showToast(`${fieldName} is too large (${sizeMB}MB > ${maxMB}MB)`, true);
            return;
          }
          
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Click to upload
      zone.addEventListener('click', () => {
        input.click();
      });

      input.addEventListener('change', () => {
        updateFileDisplay(input, zone);
      });
      
      // Add keyboard support for accessibility
      zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      });
    });

    // Clear validation errors on field input
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach(field => {
      field.addEventListener('input', () => {
        if (field.classList.contains('field-invalid')) {
          field.classList.remove('field-invalid');
          field.style.borderColor = '';
          field.style.backgroundColor = '';
        }
      });
    });

    function updateFileDisplay(input, zone) {
      const errorEl = zone.querySelector('.upload-error');
      const filenameEl = zone.querySelector('.upload-filename');
      
      if (!input.files || !input.files[0]) {
        // Clear the display when no file is selected
        zone.classList.remove('has-error');
        if (errorEl) errorEl.style.display = 'none';
        if (filenameEl) filenameEl.style.display = 'none';
        input.removeAttribute('data-size-error');
        return;
      }

      const file = input.files[0];
      const maxSize = parseInt(zone.getAttribute('data-max-size')) || 4194304;
      const fieldName = zone.getAttribute('data-field-name') || 'File';
      
      // Clear previous error
      zone.classList.remove('has-error');
      
      // Validate file size
      if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        const maxMB = (maxSize / 1024 / 1024).toFixed(1);
        const errorMsg = `${fieldName} is ${sizeMB}MB. Maximum is ${maxMB}MB.`;
        
        if (errorEl) {
          errorEl.textContent = errorMsg;
          errorEl.style.display = 'flex';
        }
        zone.classList.add('has-error');
        
        if (filenameEl) {
          filenameEl.style.display = 'none';
        }
        
        input.setAttribute('data-size-error', 'true');
        showToast(`${fieldName} exceeds size limit (${sizeMB}MB > ${maxMB}MB)`, true);
        return;
      }
      
      // Size is valid
      input.removeAttribute('data-size-error');
      if (errorEl) {
        errorEl.style.display = 'none';
      }
      
      if (filenameEl) {
        filenameEl.textContent = `✓ ${file.name}`;
        filenameEl.style.color = '#0a0a0a';
        filenameEl.style.display = 'block';
      }
      
      console.log(`[Apply] File selected: ${input.id} = ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
    }

    // ════════════════════════════════════════════════════════════
    // 5. FORM SUBMISSION
    // ════════════════════════════════════════════════════════════
    const submitBtn = document.getElementById('submit-application');
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }

    async function handleSubmit(e) {
      e.preventDefault();
      
      console.log('[Apply] Submit button clicked');
      
      // Prevent double-submit
      if (isSubmitting) {
        showToast('Your application is already being submitted. Please wait...', true);
        return;
      }
      
      // Validate the final step
      if (!validateStep(totalSteps)) {
        showToast('Please fill all required fields before submitting', true);
        return;
      }
      
      // Check for any upload zones with size errors
      const sizeErrors = document.querySelectorAll('input[data-size-error="true"]');
      if (sizeErrors.length > 0) {
        const errorFields = Array.from(sizeErrors).map(input => {
          const zone = input.closest('.upload-zone');
          return zone?.getAttribute('data-field-name') || input.id;
        }).join(', ');
        showToast(`Please fix file size errors: ${errorFields}`, true);
        
        if (sizeErrors[0]) {
          setTimeout(() => {
            sizeErrors[0].closest('.upload-zone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }
        return;
      }
      
      // Validate file sizes
      const fileValidation = validateFileSizes();
      if (!fileValidation.valid) {
        showToast(fileValidation.error, true);
        return;
      }
      
      isSubmitting = true;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.setAttribute('aria-busy', 'true');
      }
      
      showToast('Submitting your application...', false);

      try {
        // Collect form data
        const formDataObj = collectFormData();
        
        console.log('[Apply] Form data collected:', Object.keys(formDataObj));
        
        if (Object.keys(formDataObj).length === 0) {
          throw new Error('No form data collected');
        }
        
        // Separate files from text data
        const files = {};
        const textData = {};
        
        for (const [key, value] of Object.entries(formDataObj)) {
          if (value instanceof File) {
            files[key] = value;
            console.log(`[Apply] File to upload: ${key} = ${value.name} (${(value.size / 1024).toFixed(2)}KB)`);
          } else {
            textData[key] = value;
          }
        }
        
        console.log('[Apply] Total files to upload:', Object.keys(files).length);
        console.log('[Apply] Text fields:', Object.keys(textData).length);
        
        // Send to backend
        const response = await sendToBackend(textData, files);
        
        if (!response.success) {
          throw new Error(response.error || 'Submission failed');
        }
        
        console.log('[Apply] ✓ Submission successful:', response);
        showSuccessState();
        
      } catch (error) {
        console.error('[Apply] ✗ Submission error:', error);
        const userMessage = error.message || 'Failed to submit. Please check your connection and try again.';
        showToast(userMessage, true);
        
        // Re-enable button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          submitBtn.removeAttribute('aria-busy');
        }
        isSubmitting = false;
      }
    }

    // Validate all file sizes before processing
    function validateFileSizes() {
      const MAX_PER_FILE = 4 * 1024 * 1024;   // 4 MB per file
      const MAX_TOTAL_RAW = 3.5 * 1024 * 1024; // 3.5 MB raw total (safe for base64)
      let totalRawSize = 0;
      const oversizedFiles = [];

      const fileInputs = document.querySelectorAll('input[type="file"]');
      for (const input of fileInputs) {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          const fieldName = input.id || 'file';
          
          if (file.size > MAX_PER_FILE) {
            oversizedFiles.push(`${fieldName}: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
          }
          totalRawSize += file.size;
        }
      }

      if (oversizedFiles.length > 0) {
        return {
          valid: false,
          error: `File(s) exceed 4MB: ${oversizedFiles.join(', ')}`
        };
      }

      // Check total size (accounting for base64 encoding expansion ~33%)
      const estimatedPayloadSize = totalRawSize * 1.35;
      if (estimatedPayloadSize > MAX_TOTAL_RAW) {
        const currentTotalMB = (totalRawSize / 1024 / 1024).toFixed(1);
        const maxTotalMB = (MAX_TOTAL_RAW / 1024 / 1024).toFixed(1);
        return {
          valid: false,
          error: `Total file size too large (${currentTotalMB}MB raw). Please reduce files to under ${maxTotalMB}MB total.`
        };
      }

      return { valid: true };
    }

    // Send form data to backend API with retry logic
    async function sendToBackend(textData, files, retryCount = 0) {
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 2000;
      
      console.log('[Apply] Starting file conversions...');
      
      const convertedFiles = {};
      
      // Convert each file to base64
      for (const [key, file] of Object.entries(files)) {
        try {
          console.log(`[Apply] Converting: ${key} (${file.name}, ${(file.size / 1024).toFixed(2)}KB)`);
          const base64 = await fileToBase64(file);
          console.log(`[Apply] ✓ Converted: ${key} (base64: ${base64.length} chars)`);
          convertedFiles[key] = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          };
        } catch (err) {
          console.error(`[Apply] ✗ Conversion failed: ${key} - ${err.message}`);
          throw new Error(`Failed to process ${key}: ${err.message}`);
        }
      }
      
      // Build payload
      const payload = {
        formData: textData,
        files: convertedFiles,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      console.log('[Apply] Payload ready:');
      console.log('  - Text fields:', Object.keys(textData).length);
      console.log('  - Files:', Object.keys(convertedFiles).length);

      // Serialize payload
      let jsonString;
      try {
        jsonString = JSON.stringify(payload);
        console.log(`[Apply] Payload size: ${jsonString.length} bytes`);
      } catch (jsonErr) {
        console.error('[Apply] Serialization error:', jsonErr.message);
        throw new Error('Failed to serialize form data');
      }
      
      // Send request
      let response;
      try {
        console.log(`[Apply] Sending request (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        response = await fetch('/api/submit-application', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: jsonString,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`[Apply] Response status: ${response.status}`);
        
      } catch (fetchErr) {
        console.error('[Apply] Fetch error:', fetchErr.message);
        
        // Retry logic for transient failures
        if (retryCount < MAX_RETRIES && (fetchErr.name === 'TypeError' || fetchErr.name === 'AbortError')) {
          console.log(`[Apply] Retrying in ${RETRY_DELAY}ms...`);
          showToast(`Network issue - retrying... (${retryCount + 2}/${MAX_RETRIES + 1})`, true);
          
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return sendToBackend(textData, files, retryCount + 1);
        }
        
        let userError = 'Network error - please check your connection';
        if (fetchErr.name === 'AbortError') {
          userError = 'Request timed out - please try again';
        } else if (fetchErr.message.includes('Failed to fetch')) {
          userError = 'Cannot connect to server - please check your internet connection';
        }
        throw new Error(userError);
      }

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error('[Apply] JSON parse error:', jsonErr.message);
        throw new Error('Invalid response from server');
      }
      
      console.log('[Apply] Backend response:', data);
      
      // Check for HTTP error status
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      // Check for business logic errors
      if (!data.success) {
        throw new Error(data.error || 'Submission failed');
      }
      
      console.log('[Apply] ✓ Submission successful!');
      console.log(`[Apply]   Files uploaded: ${data.filesReceived || 0}`);
      
      return data;
    }

    // Convert File to base64 string
    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        // Validate file
        if (!file || !(file instanceof File)) {
          reject(new Error('Invalid file object'));
          return;
        }

        // Check file size (max 10MB for safety)
        if (file.size > 10 * 1024 * 1024) {
          reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 10MB)`));
          return;
        }

        // Check if FileReader is available
        if (typeof FileReader === 'undefined') {
          reject(new Error('File reading not supported in this browser'));
          return;
        }

        const reader = new FileReader();
        let timeout;
        
        // Timeout handler
        const startTimeout = () => {
          timeout = setTimeout(() => {
            try {
              reader.abort();
            } catch (e) {
              // Ignore abort error
            }
            reject(new Error('File reading timed out - please try a smaller file'));
          }, 30000);
        };
        
        reader.onload = () => {
          clearTimeout(timeout);
          try {
            const result = reader.result;
            if (!result) {
              throw new Error('File reading returned empty result');
            }
            
            // Extract base64 part (after comma)
            const base64Match = result.match(/^data:[^;]+;base64,(.+)$/);
            if (!base64Match || !base64Match[1]) {
              throw new Error('Invalid file format');
            }
            
            const base64 = base64Match[1];
            
            if (base64.length === 0) {
              throw new Error('File converted to empty data');
            }
            
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = () => {
          clearTimeout(timeout);
          const errorName = reader.error?.name || 'Unknown';
          
          let userMessage = 'Failed to read file';
          if (errorName === 'NotReadableError') {
            userMessage = 'File cannot be read - it may be corrupted';
          } else if (errorName === 'SecurityError') {
            userMessage = 'File access denied';
          }
          
          reject(new Error(userMessage));
        };

        reader.onabort = () => {
          clearTimeout(timeout);
          reject(new Error('File reading was cancelled'));
        };

        // Start reading
        try {
          startTimeout();
          reader.readAsDataURL(file);
        } catch (err) {
          clearTimeout(timeout);
          reject(new Error(`Failed to start file reading: ${err.message}`));
        }
      });
    }

    // Collect all form data including files
    function collectFormData() {
      const data = {};
      const processedRadios = new Set();
      const processedCheckboxes = new Set();
      
      document.querySelectorAll('input, textarea, select').forEach(field => {
        if (!field.id) return;
        
        // Handle file inputs
        if (field.type === 'file') {
          if (field.files && field.files[0]) {
            data[field.id] = field.files[0];
          }
        }
        // Handle checkboxes - collect ALL checked values
        else if (field.type === 'checkbox') {
          const fieldName = field.name || field.id;
          if (!processedCheckboxes.has(fieldName)) {
            const checkedBoxes = document.querySelectorAll(`input[name="${fieldName}"]:checked, input[id="${fieldName}"]:checked`);
            if (checkedBoxes.length > 0) {
              const values = Array.from(checkedBoxes).map(cb => cb.value || 'true');
              data[fieldName] = values.length === 1 ? values[0] : values.join(', ');
            }
            processedCheckboxes.add(fieldName);
          }
        }
        // Handle radio buttons
        else if (field.type === 'radio') {
          const fieldName = field.name || field.id;
          if (!processedRadios.has(fieldName)) {
            const checked = document.querySelector(`input[name="${fieldName}"]:checked`);
            if (checked) {
              data[fieldName] = checked.value;
            }
            processedRadios.add(fieldName);
          }
        }
        // Handle text fields
        else if (field.value && field.value.trim()) {
          data[field.id] = field.value.trim();
        }
      });
      
      return data;
    }

    // Show success state and reset form
    function showSuccessState() {
      // Reset all form fields
      document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="url"], textarea, select').forEach(field => {
        field.value = '';
        field.style.borderColor = '';
        field.style.backgroundColor = '';
        field.classList.remove('field-invalid');
        field.removeAttribute('data-size-error');
      });

      // Clear radio and checkbox selections
      document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(field => {
        field.checked = false;
        field.style.borderColor = '';
        field.style.backgroundColor = '';
        field.classList.remove('field-invalid');
      });

      // Clear file uploads
      document.querySelectorAll('input[type="file"]').forEach(field => {
        field.value = '';
        field.removeAttribute('data-size-error');
        try {
          const dt = new DataTransfer();
          field.files = dt.files;
        } catch (e) {
          // Silently fail if DataTransfer unavailable
        }
      });

      // Clear file displays
      document.querySelectorAll('.upload-filename').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
        el.style.color = '';
      });

      // Clear error displays
      document.querySelectorAll('.upload-error').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
      });

      // Clear upload zone error states
      document.querySelectorAll('.upload-zone').forEach(zone => {
        zone.classList.remove('has-error');
        zone.style.borderColor = '';
        zone.style.backgroundColor = '';
      });

      // Reset form submission state
      isSubmitting = false;
      currentStep = 1;

      // Show success
      setTimeout(() => {
        goToStep(totalSteps + 1);
        showToast('Application submitted successfully!', false);
      }, 100);

      // Re-enable button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.removeAttribute('aria-busy');
      }
    }

    // ════════════════════════════════════════════════════════════
    // 6. BUTTON HANDLERS
    // ════════════════════════════════════════════════════════════
    document.querySelectorAll('.form-nav button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();

        if (btn.id.startsWith('next-')) {
          const step = parseInt(btn.id.split('-')[1]);
          if (validateStep(step)) {
            goToStep(step + 1);
          }
        } else if (btn.id.startsWith('back-')) {
          const step = parseInt(btn.id.split('-')[1]);
          goToStep(step - 1);
        }
      });
    });

    // ════════════════════════════════════════════════════════════
    // 7. STEP NAV CLICKS (SIDEBAR)
    // ════════════════════════════════════════════════════════════
    document.querySelectorAll('.step-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const step = parseInt(item.dataset.step);
        if (!isNaN(step) && step >= 1 && step <= totalSteps) {
          goToStep(step);
        }
      });
      
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          const step = parseInt(item.dataset.step);
          if (!isNaN(step) && step >= 1 && step <= totalSteps) {
            goToStep(step);
          }
        }
      });
    });

    // ════════════════════════════════════════════════════════════
    // 8. TOAST NOTIFICATIONS
    // ════════════════════════════════════════════════════════════
    function showToast(message, isError = false) {
      const toast = document.querySelector('.toast');
      if (!toast) {
        // Fallback toast
        try {
          const fallbackToast = document.createElement('div');
          fallbackToast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);max-width:400px;padding:12px 16px;background:' + (isError ? '#c0392b' : '#27ae60') + ';color:#fff;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
          fallbackToast.textContent = message;
          document.body.appendChild(fallbackToast);
          setTimeout(() => fallbackToast.remove(), isError ? 5000 : 3000);
        } catch (e) {
          console.error('[Apply] Toast error:', e);
        }
        return;
      }

      const icon = toast.querySelector('.toast-icon');
      if (isError) {
        toast.style.background = '#c0392b';
        toast.style.zIndex = '10000';
        if (icon) {
          icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        }
      } else {
        toast.style.background = '#27ae60';
        toast.style.zIndex = '9999';
        if (icon) {
          icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
        }
      }

      const textEl = toast.querySelector('.toast-text');
      if (textEl) {
        textEl.textContent = message;
      }
      
      toast.classList.add('show');

      clearTimeout(toast._timeout);
      
      const duration = isError ? 5000 : 3000;
      toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
      }, duration);
    }

    // ════════════════════════════════════════════════════════════
    // 9. OFFLINE DETECTION
    // ════════════════════════════════════════════════════════════
    window.addEventListener('online', () => {
      showToast('Your connection has been restored', false);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    });

    window.addEventListener('offline', () => {
      showToast('No internet connection - please reconnect to submit', true);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
      }
    });

    // ════════════════════════════════════════════════════════════
    // 10. INITIALIZE
    // ════════════════════════════════════════════════════════════
    goToStep(1);

    // Remove js-disabled fallback class
    document.documentElement.classList.remove('js-disabled');
    
    console.log('[Apply] Form ready');
  }
})();
