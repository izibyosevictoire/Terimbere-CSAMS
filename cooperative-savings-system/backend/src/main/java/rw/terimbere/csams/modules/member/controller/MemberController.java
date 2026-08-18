package rw.terimbere.csams.modules.member.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import rw.terimbere.csams.modules.member.dto.AssignAdministratorRequest;
import rw.terimbere.csams.modules.member.dto.MemberDetailResponse;
import rw.terimbere.csams.modules.member.dto.MemberFinancialSummaryResponse;
import rw.terimbere.csams.modules.member.dto.MemberRegisterRequest;
import rw.terimbere.csams.modules.member.dto.MemberResponse;
import rw.terimbere.csams.modules.member.dto.MemberStatusUpdateRequest;
import rw.terimbere.csams.modules.member.dto.MemberUpdateRequest;
import rw.terimbere.csams.modules.member.service.MemberService;
import rw.terimbere.csams.shared.common.dto.ApiResponse;
import rw.terimbere.csams.shared.common.dto.PageResponse;

@RestController
@RequiredArgsConstructor
@Tag(name = "Members", description = "Cooperative member management")
@SecurityRequirement(name = "bearerAuth")
public class MemberController {

    private final MemberService memberService;

    @PostMapping("/api/v1/cooperatives/{cooperativeId}/members")
    @PreAuthorize("hasAuthority('MEMBERSHIP_MANAGE') or hasAuthority('USER_WRITE')")
    @Operation(
            summary = "Register a member",
            description =
                    "Creates user + ACTIVE membership. JWT coopIds for the new member stay stale until they login/refresh;"
                            + " frontend should use GET /api/v1/cooperatives/mine for the selector.")
    public ResponseEntity<ApiResponse<MemberResponse>> register(
            @PathVariable UUID cooperativeId,
            @Valid @RequestBody MemberRegisterRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(memberService.register(cooperativeId, request, httpRequest)));
    }

    @GetMapping("/api/v1/cooperatives/{cooperativeId}/members")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List cooperative members")
    public ResponseEntity<ApiResponse<PageResponse<MemberResponse>>> list(
            @PathVariable UUID cooperativeId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(memberService.list(cooperativeId, q, status, pageable)));
    }

    @GetMapping("/api/v1/cooperatives/{cooperativeId}/members/financial-summaries")
    @PreAuthorize("hasAuthority('MEMBERSHIP_MANAGE') or hasAuthority('USER_WRITE')")
    @Operation(
            summary = "List member financial summaries",
            description = "Paginated dashboard rows for Member Financial Summary. Avoids N+1 HTTP calls from the client.")
    public ResponseEntity<ApiResponse<PageResponse<MemberFinancialSummaryResponse>>> listFinancialSummaries(
            @PathVariable UUID cooperativeId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(memberService.listFinancialSummaries(cooperativeId, q, pageable)));
    }

    @GetMapping("/api/v1/cooperatives/{cooperativeId}/members/{memberUserId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get member detail")
    public ResponseEntity<ApiResponse<MemberDetailResponse>> getDetail(
            @PathVariable UUID cooperativeId, @PathVariable UUID memberUserId) {
        return ResponseEntity.ok(ApiResponse.ok(memberService.getDetail(cooperativeId, memberUserId)));
    }

    @GetMapping("/api/v1/cooperatives/{cooperativeId}/members/{memberUserId}/financial-summary")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get member financial summary",
            description =
                    "Computed totals for contributions, loans, fines, social fund, and payouts. "
                            + "Members may view their own summary; MEMBERSHIP_MANAGE or SUPER_ADMIN may view others.")
    public ResponseEntity<ApiResponse<MemberFinancialSummaryResponse>> financialSummary(
            @PathVariable UUID cooperativeId, @PathVariable UUID memberUserId) {
        return ResponseEntity.ok(ApiResponse.ok(memberService.financialSummary(cooperativeId, memberUserId)));
    }

    @PutMapping("/api/v1/cooperatives/{cooperativeId}/members/{memberUserId}")
    @PreAuthorize("hasAuthority('MEMBERSHIP_MANAGE') or hasAuthority('USER_WRITE')")
    @Operation(summary = "Update member profile")
    public ResponseEntity<ApiResponse<MemberResponse>> update(
            @PathVariable UUID cooperativeId,
            @PathVariable UUID memberUserId,
            @Valid @RequestBody MemberUpdateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
                ApiResponse.ok(memberService.update(cooperativeId, memberUserId, request, httpRequest)));
    }

    @PatchMapping("/api/v1/cooperatives/{cooperativeId}/members/{memberUserId}/status")
    @PreAuthorize("hasAuthority('MEMBERSHIP_MANAGE') or hasAuthority('USER_WRITE')")
    @Operation(summary = "Update member account and/or membership status")
    public ResponseEntity<ApiResponse<MemberResponse>> updateStatus(
            @PathVariable UUID cooperativeId,
            @PathVariable UUID memberUserId,
            @Valid @RequestBody MemberStatusUpdateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
                ApiResponse.ok(memberService.updateStatus(cooperativeId, memberUserId, request, httpRequest)));
    }

    @PostMapping(
            value = "/api/v1/cooperatives/{cooperativeId}/members/{memberUserId}/profile-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload member profile image")
    public ResponseEntity<ApiResponse<MemberResponse>> uploadProfileImage(
            @PathVariable UUID cooperativeId,
            @PathVariable UUID memberUserId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                memberService.uploadProfileImage(cooperativeId, memberUserId, file, httpRequest)));
    }

    @PostMapping("/api/v1/cooperatives/{id}/administrators")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Assign or create a cooperative administrator")
    public ResponseEntity<ApiResponse<MemberResponse>> assignAdministrator(
            @PathVariable("id") UUID cooperativeId,
            @Valid @RequestBody AssignAdministratorRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
                ApiResponse.ok(memberService.assignAdministrator(cooperativeId, request, httpRequest)));
    }
}
