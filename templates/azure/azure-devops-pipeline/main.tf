terraform {
  required_providers {
    azuredevops = {
      source  = "microsoft/azuredevops"
      version = "~> 0.9"
    }
  }
}

provider "azuredevops" {
  org_service_url       = var.org_service_url
  personal_access_token = var.personal_access_token
}

data "azuredevops_project" "this" {
  name = var.project_name
}

resource "azuredevops_git_repository" "this" {
  count      = var.create_repository ? 1 : 0
  project_id = data.azuredevops_project.this.id
  name       = var.repository_name

  initialization {
    init_type = "Clean"
  }
}

data "azuredevops_git_repository" "existing" {
  count      = var.create_repository ? 0 : 1
  project_id = data.azuredevops_project.this.id
  name       = var.repository_name
}

resource "azuredevops_build_definition" "this" {
  project_id = data.azuredevops_project.this.id
  name       = var.pipeline_name
  path       = var.pipeline_path

  ci_trigger {
    use_yaml = true
  }

  repository {
    repo_type   = "TfsGit"
    repo_id     = var.create_repository ? azuredevops_git_repository.this[0].id : data.azuredevops_git_repository.existing[0].id
    branch_name = var.default_branch
    yml_path    = var.yaml_path
  }

  dynamic "variable" {
    for_each = var.pipeline_variables
    content {
      name      = variable.value.name
      value     = variable.value.is_secret ? null : variable.value.value
      secret_value = variable.value.is_secret ? variable.value.value : null
      is_secret = variable.value.is_secret
    }
  }
}

resource "azuredevops_branch_policy_min_reviewers" "this" {
  count      = var.enable_branch_policy ? 1 : 0
  project_id = data.azuredevops_project.this.id

  enabled  = true
  blocking = true

  settings {
    reviewer_count                         = var.min_reviewers
    submitter_can_vote                     = false
    last_pusher_cannot_approve             = true
    allow_completion_with_rejects_or_waits = false
    on_push_reset_approved_votes           = true

    scope {
      repository_id  = var.create_repository ? azuredevops_git_repository.this[0].id : data.azuredevops_git_repository.existing[0].id
      repository_ref = "refs/heads/${var.default_branch}"
      match_type     = "Exact"
    }
  }
}

resource "azuredevops_branch_policy_build_validation" "this" {
  count      = var.enable_build_validation ? 1 : 0
  project_id = data.azuredevops_project.this.id

  enabled  = true
  blocking = true

  settings {
    display_name        = "Build Validation"
    build_definition_id = azuredevops_build_definition.this.id
    valid_duration      = 720

    scope {
      repository_id  = var.create_repository ? azuredevops_git_repository.this[0].id : data.azuredevops_git_repository.existing[0].id
      repository_ref = "refs/heads/${var.default_branch}"
      match_type     = "Exact"
    }
  }
}
