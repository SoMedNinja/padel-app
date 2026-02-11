import SwiftUI

struct AuthView: View {
    enum AuthMode: String, CaseIterable, Identifiable {
        case signIn = "Sign In"
        case signUp = "Sign Up"

        var id: String { rawValue }
    }

    @EnvironmentObject private var viewModel: AppViewModel

    @State private var mode: AuthMode = .signIn
    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Spacer(minLength: 24)

                Image(systemName: "sportscourt.fill")
                    .font(.system(size: 54))
                    .foregroundStyle(.green)

                Text("Padel Club")
                    .font(.largeTitle.bold())

                Text("Note for non-coders: this screen is the native iOS version of the web login/signup flow. It controls who can access the dashboard and profile features.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                Picker("Auth Mode", selection: $mode) {
                    ForEach(AuthMode.allCases) { authMode in
                        Text(authMode.rawValue)
                            .tag(authMode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                Form {
                    if mode == .signUp {
                        TextField("Full name", text: $fullName)
                            .textInputAutocapitalization(.words)
                    }

                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    SecureField("Password", text: $password)

                    Button {
                        Task {
                            if mode == .signIn {
                                await viewModel.signIn(email: email, password: password)
                            } else {
                                await viewModel.signUp(name: fullName, email: email, password: password)
                            }
                        }
                    } label: {
                        if viewModel.isAuthenticating {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text(mode == .signIn ? "Sign In" : "Create Account")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(viewModel.isAuthenticating)
                }
                .scrollContentBackground(.hidden)
                .background(Color.clear)

                if let authMessage = viewModel.authMessage {
                    Text(authMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                Spacer()
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Welcome")
        }
    }
}
