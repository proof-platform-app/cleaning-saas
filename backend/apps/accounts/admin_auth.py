from django import forms
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.forms import AuthenticationForm

User = get_user_model()

class EmailAuthenticationForm(AuthenticationForm):
    """
    Та же форма, что и стандартная, но явно аутентифицируем по email.
    """

    username = forms.EmailField(label="Email", max_length=254)

    def clean(self):
        email = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if email is not None and password:
            # Явно зовём authenticate по USERNAME_FIELD=email
            self.user_cache = authenticate(
                self.request,
                username=email,
                password=password,
            )
            if self.user_cache is None:
                raise forms.ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                    params={"username": self.username_field.verbose_name},
                )
            else:
                self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data
